import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { connectDb, db } from './db.js';
import solc from 'solc';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Gemini API
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log('Gemini AI Provider initialized.');
} else {
  console.warn('GEMINI_API_KEY not set. Backend will run in Mock AI mode.');
}

// BOT Chain configurations & RPC Endpoints
const TESTNET_RPC = 'https://rpc.bohr.life';
const MAINNET_RPC = 'https://rpc.botchain.ai';

const CONTRACT_ADDRESSES = {
  mainnet: '0x380cD522A27B84d38E8988483da89660EcD8c141',
  testnet: '0x290EC24ed697A2ADb890F100499b615e83439e78'
};

// Connect Database
await connectDb(process.env.MONGO_URI);

/**
 * Helper to verify blockchain payment transaction on BOT Chain
 */
async function verifyPayment(txHash, agentId, expectedPrice, network) {
  // If agent is free, bypass blockchain payment verification
  if (!expectedPrice || expectedPrice === '0' || expectedPrice === '0.0') {
    return {
      success: true,
      amount: '0',
      creatorRevenue: '0',
      platformFee: '0',
      userAddress: '0x0000000000000000000000000000000000000000'
    };
  }

  if (!txHash) {
    throw new Error('Payment transaction hash is required for this paid agent.');
  }

  // Connect to the specific provider based on target network
  let rpcUrl;
  let staticNet;
  if (network === 'testnet') {
    rpcUrl = TESTNET_RPC;
    staticNet = new ethers.Network('BOT Chain Testnet', 968);
  } else {
    rpcUrl = MAINNET_RPC;
    staticNet = new ethers.Network('BOT Chain Mainnet', 677);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { staticNetwork: staticNet });

  let txReceipt = null;
  try {
    txReceipt = await provider.getTransactionReceipt(txHash);
  } catch (e) {
    console.error(`Error fetching transaction receipt on ${network}:`, e.message);
  }

  if (!txReceipt) {
    // No mock fallback: an unconfirmed or unknown transaction must never grant access.
    throw new Error('Payment transaction not found on BOT Chain. Ensure it is confirmed before retrying.');
  }

  if (txReceipt.status !== 1) {
    throw new Error('On-chain transaction failed.');
  }

  // Prevent double-spending / replay attacks
  const isUsed = await db.isTxProcessed(txHash);
  if (isUsed) {
    throw new Error('This transaction has already been processed.');
  }

  // Fetch full transaction details
  const tx = await provider.getTransaction(txHash);
  if (!tx) {
    throw new Error('Could not retrieve transaction details.');
  }

  const sentValue = tx.value;
  // Parse expected price to BigInt (handling decimal strings or wei values)
  let expectedWei;
  try {
    expectedWei = BigInt(expectedPrice);
  } catch (e) {
    // Fallback if price is in standard token representation rather than wei
    expectedWei = ethers.parseEther(expectedPrice);
  }

  if (sentValue < expectedWei) {
    throw new Error(`Insufficient funds sent. Expected ${expectedWei.toString()} wei, got ${sentValue.toString()} wei.`);
  }

  // Search logs for AgentPaid event
  // Event signature: AgentPaid(uint256 indexed requestId, uint256 indexed agentId, address indexed user, address creator, uint256 totalAmount, uint256 creatorRevenue, uint256 platformFee)
  const agentPaidEventSignature = ethers.id("AgentPaid(uint256,uint256,address,address,uint256,uint256,uint256)");
  const expectedContract = network === 'testnet' ? CONTRACT_ADDRESSES.testnet : CONTRACT_ADDRESSES.mainnet;
  
  let agentPaidLog = null;
  for (const log of txReceipt.logs) {
    if (
      log.topics[0] === agentPaidEventSignature &&
      log.address.toLowerCase() === expectedContract.toLowerCase()
    ) {
      agentPaidLog = log;
      break;
    }
  }

  let userAddress = tx.from;
  let totalAmount = sentValue.toString();
  let creatorRevenue = (sentValue * 95n / 100n).toString(); // Fallback 95% split
  let platformFee = (sentValue * 5n / 100n).toString(); // Fallback 5% split

  if (!agentPaidLog) {
    throw new Error("Transaction does not contain the required AgentPaid smart contract event log.");
  }

  try {
    const abiCoder = new ethers.AbiCoder();
    // Decode the non-indexed parameters: [address creator, uint256 totalAmount, uint256 creatorRevenue, uint256 platformFee]
    const decodedData = abiCoder.decode(
      ['address', 'uint256', 'uint256', 'uint256'],
      agentPaidLog.data
    );
    
    // Check agent ID in topics (topics[2] is the indexed agentId)
    const loggedAgentId = Number(ethers.toBigInt(agentPaidLog.topics[2]));
    
    if (loggedAgentId !== Number(agentId)) {
      throw new Error(`Transaction was paid for agent #${loggedAgentId}, but requested agent #${agentId}.`);
    }

    creatorRevenue = decodedData[2].toString();
    platformFee = decodedData[3].toString();
    totalAmount = decodedData[1].toString();

    // topics[3] is the indexed user address (already encoded as bytes32)
    // Strip to the last 20 bytes (40 hex chars) to get the address
    userAddress = ethers.getAddress('0x' + agentPaidLog.topics[3].slice(-40));
  } catch (err) {
    throw new Error(`Failed to decode AgentPaid log details: ${err.message}`);
  }

  return {
    success: true,
    amount: totalAmount,
    creatorRevenue,
    platformFee,
    userAddress
  };
}

// Helper to create a slug from a name
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-'); // Replace multiple - with single -
}

// --- API ROUTES ---

// Health check / keep-alive ping endpoint
// Used by external cron services (e.g. cron-job.org, UptimeRobot) to prevent
// Render free-tier cold starts. Safe to call as frequently as every 5 minutes.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// 1. Get all agents
app.get('/api/agents', async (req, res) => {
  try {
    const { category, creator, network } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    if (creator) query.creator = creator;
    if (network) query.network = network;
    
    const agents = await db.getAgents(query);
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get creator's own agents (includes inactive ones)
app.get('/api/agents/creator/:address', async (req, res) => {
  try {
    const creator = req.params.address;
    const { network } = req.query;
    const query = { creator };
    if (network) query.network = network;
    const agents = await db.getAgents(query);
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get single agent by ID or Slug
app.get('/api/agents/:idOrSlug', async (req, res) => {
  try {
    const param = req.params.idOrSlug;
    const { network } = req.query;
    let agent = null;
    if (isNaN(param)) {
      agent = await db.getAgentBySlug(param, network);
    } else {
      agent = await db.getAgentById(Number(param), network || 'mainnet');
    }
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Create new Agent (registers in db after on-chain deployment / registration)
app.post('/api/agents', async (req, res) => {
  try {
    const { id, name, description, category, systemPrompt, pricePerRequest, metadataURI, avatar, creator, network } = req.body;
    
    if (!id || !name || !category || !systemPrompt || pricePerRequest === undefined || !creator) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const targetNetwork = network || 'mainnet';

    // Generate clean slug
    let slug = slugify(name);
    const existing = await db.getAgentBySlug(slug, targetNetwork);
    if (existing) {
      slug = `${slug}-${id}`;
    }

    const agent = await db.createAgent({
      id: Number(id),
      name,
      description,
      category,
      systemPrompt,
      pricePerRequest: pricePerRequest.toString(),
      metadataURI: metadataURI || '',
      avatar: avatar || '',
      creator: creator.toLowerCase(),
      isActive: true,
      slug,
      network: targetNetwork
    });

    res.status(201).json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Update agent status or settings (creator only)
app.put('/api/agents/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description, category, systemPrompt, pricePerRequest, metadataURI, avatar, isActive, creator, network } = req.body;
    
    const targetNetwork = network || 'mainnet';
    const agent = await db.getAgentById(id, targetNetwork);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (agent.creator.toLowerCase() !== creator.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to update this agent' });
    }

    const updated = await db.updateAgent(id, {
      name,
      description,
      category,
      systemPrompt,
      pricePerRequest: pricePerRequest.toString(),
      metadataURI,
      avatar,
      isActive,
      network: targetNetwork
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Fetch conversation messages
app.get('/api/chat/:agentId/:userAddress', async (req, res) => {
  try {
    const { agentId, userAddress } = req.params;
    const { network } = req.query;
    const conversation = await db.getConversation(userAddress, Number(agentId), network || 'mainnet');
    if (!conversation) {
      return res.json({ messages: [] });
    }
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Chat Execution Flow (Verify Payment -> Call Gemini AI -> Update DB)
app.post('/api/chat/:agentId', async (req, res) => {
  try {
    const agentId = Number(req.params.agentId);
    const { userAddress, message, txHash, network } = req.body;

    if (!userAddress || !message) {
      return res.status(400).json({ error: 'Missing userAddress or message' });
    }

    const targetNetwork = network || 'mainnet';
    const agent = await db.getAgentById(agentId, targetNetwork);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // 1. Verify Payment on-chain
    console.log(`Verifying payment for agent #${agentId} on ${targetNetwork} (price: ${agent.pricePerRequest} wei, tx: ${txHash || 'FREE'})`);
    let paymentInfo;
    try {
      paymentInfo = await verifyPayment(txHash, agentId, agent.pricePerRequest, targetNetwork);
    } catch (err) {
      console.error('Payment verification failed:', err.message);
      return res.status(402).json({ error: `Payment verification failed: ${err.message}` });
    }

    // 2. Fetch or initialize conversation history
    let conversation = await db.getConversation(userAddress, agentId, targetNetwork);
    const history = conversation ? conversation.messages : [];
    
    // Add current user message
    history.push({ role: 'user', content: message, timestamp: new Date() });

    // 3. Trigger AI agent execution
    let aiResponse = '';
    
    if (!genAI) {
      throw new Error("AI provider configuration error: GEMINI_API_KEY is not configured on the backend server.");
    }
    
    // systemInstruction must be set on the model. The SDK wraps a plain string
    // into the required Content object here; passing it to startChat does not.
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      systemInstruction: agent.systemPrompt
    });

    // Convert history format to Gemini SDK standard structure
    const contents = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const chatSession = model.startChat({
      history: contents.slice(0, -1) // feed previous history to start
    });

    const result = await chatSession.sendMessage(message);
    aiResponse = result.response.text();

    // Add model response to history
    history.push({ role: 'model', content: aiResponse, timestamp: new Date() });

    // 4. Save conversation history
    await db.saveConversation(userAddress, agentId, history, targetNetwork);

    // 5. If paid transaction, record transaction and update analytics
    if (agent.pricePerRequest !== '0' && txHash) {
      await db.recordTransaction({
        txHash,
        agentId,
        userAddress: userAddress.toLowerCase(),
        amount: paymentInfo.amount,
        creatorRevenue: paymentInfo.creatorRevenue,
        platformFee: paymentInfo.platformFee,
        status: 'verified',
        network: targetNetwork
      });

      // Increment agent usage and update total creator earnings in database
      await db.incrementAgentUsage(agentId, paymentInfo.amount, paymentInfo.creatorRevenue, paymentInfo.platformFee, targetNetwork);
    } else if (agent.pricePerRequest === '0') {
      // Just increment usage for free requests
      await db.incrementAgentUsage(agentId, '0', '0', '0', targetNetwork);
    }

    // Send AI response to client
    res.json({
      response: aiResponse,
      history
    });

  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 8. Get transaction history (for user or dashboard)
app.get('/api/transactions', async (req, res) => {
  try {
    const { userAddress, agentId, network } = req.query;
    const query = {};
    if (userAddress) query.userAddress = userAddress.toLowerCase();
    if (agentId) query.agentId = Number(agentId);
    if (network) query.network = network;

    const transactions = await db.getTransactions(query);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Get creator analytics
app.get('/api/analytics/:creatorAddress', async (req, res) => {
  try {
    const creator = req.params.creatorAddress.toLowerCase();
    const { network } = req.query;
    
    // Get all agents created by this address for this network
    const query = { creator };
    if (network) query.network = network;
    const creatorAgents = await db.getAgents(query);
    
    let totalEarningsWei = 0n;
    let totalRequests = 0;
    const agentStats = [];

    for (const agent of creatorAgents) {
      totalRequests += agent.usageCount;
      totalEarningsWei += BigInt(agent.revenueGenerated || '0');
      
      agentStats.push({
        id: agent.id,
        name: agent.name,
        category: agent.category,
        pricePerRequest: agent.pricePerRequest,
        usageCount: agent.usageCount,
        revenueGenerated: agent.revenueGenerated,
        slug: agent.slug
      });
    }

    // Fetch recent transactions for this creator's agents on this network
    const txQuery = { network: network || 'mainnet' };
    const allTxs = await db.getTransactions(txQuery);
    const agentIdsSet = new Set(creatorAgents.map(a => a.id));
    const recentTransactions = allTxs
      .filter(t => agentIdsSet.has(t.agentId))
      .slice(0, 10); // limit to last 10

    res.json({
      totalEarnings: totalEarningsWei.toString(),
      totalRequests,
      agentsCount: creatorAgents.length,
      agentStats,
      recentTransactions
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Sandbox AI Smart Contract Generation
app.post('/api/sandbox/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!genAI) {
      return res.status(500).json({ error: 'AI provider not configured' });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      systemInstruction: `You are a Solidity Smart Contract Generator. Your only job is to write valid, deployable Solidity smart contracts for the BOT Chain (EVM chain).
You must output ONLY valid Solidity source code. 
CRITICAL: Do NOT wrap the code in markdown code blocks like \`\`\`solidity or \`\`\`. Start directly with "// SPDX-License-Identifier: MIT" and "pragma solidity". 
Do NOT include any introduction, explanations, notes, or chat text. Output only raw code. Ensure compilation safety (e.g., standard libraries, correct licenses, no compile errors).`
    });

    const result = await model.generateContent(prompt);
    let code = result.response.text().trim();

    // In case the AI still wraps it in markdown block quotes
    if (code.startsWith('```')) {
      code = code.replace(/^```solidity\n?|^```\n?/, '').replace(/```$/, '').trim();
    }

    res.json({ success: true, code });
  } catch (error) {
    console.error('Sandbox contract generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 11. Sandbox Solidity compilation
app.post('/api/sandbox/compile', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Code is required' });
    }

    const input = {
      language: 'Solidity',
      sources: {
        'Contract.sol': {
          content: code
        }
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode']
          }
        }
      }
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    // Check for errors
    if (output.errors) {
      const errors = output.errors.filter(err => err.severity === 'error');
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          errors: errors.map(err => err.formattedMessage)
        });
      }
    }

    // Get contract details
    const contracts = output.contracts['Contract.sol'];
    if (!contracts || Object.keys(contracts).length === 0) {
      return res.status(400).json({ success: false, error: 'No contracts found in compilation' });
    }

    const contractName = Object.keys(contracts)[0];
    const abi = contracts[contractName].abi;
    const bytecode = contracts[contractName].evm.bytecode.object;

    res.json({
      success: true,
      contractName,
      abi,
      bytecode
    });
  } catch (error) {
    console.error('Compilation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 12. Sandbox AI contract debug/fix
app.post('/api/sandbox/fix', async (req, res) => {
  try {
    const { code, error } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    if (!genAI) {
      return res.status(500).json({ error: 'AI provider not configured' });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      systemInstruction: `You are a Solidity Smart Contract Debugger. You will be given a Solidity contract that fails to compile or deploy, along with the error message/stack trace.
Your task is to analyze the error, identify the bugs, and return the fixed, valid Solidity contract source code.
You must output ONLY valid Solidity source code.
CRITICAL: Do NOT wrap the code in markdown code blocks like \`\`\`solidity or \`\`\`. Start directly with "// SPDX-License-Identifier: MIT" and "pragma solidity". 
Do NOT include any explanations, introduction, notes, or chat text. Output only raw code.`
    });

    const prompt = `Here is the current Solidity code:
\`\`\`solidity
${code}
\`\`\`

Here is the compilation or deployment error:
${error}

Please provide the corrected Solidity contract source code.`;

    const result = await model.generateContent(prompt);
    let fixedCode = result.response.text().trim();

    // Clean markdown wraps if generated
    if (fixedCode.startsWith('```')) {
      fixedCode = fixedCode.replace(/^```solidity\n?|^```\n?/, '').replace(/```$/, '').trim();
    }

    res.json({ success: true, code: fixedCode });
  } catch (err) {
    console.error('Sandbox fix error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Register a deployed faucet
app.post('/api/sandbox/faucets', async (req, res) => {
  try {
    const { address, name, creator, network, abi } = req.body;
    if (!address || !name || !creator || !network || !abi) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const faucet = await db.registerFaucet({ address, name, creator, network, abi });
    res.json({ success: true, faucet });
  } catch (err) {
    console.error('Register faucet error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fetch active faucets
app.get('/api/sandbox/faucets', async (req, res) => {
  try {
    const { network } = req.query;
    const faucets = await db.getFaucets(network);
    res.json({ success: true, faucets });
  } catch (err) {
    console.error('Get faucets error:', err);
    res.status(500).json({ error: err.message });
  }
});

// In-memory stores for Captchas and Faucet rate-limiting
const captchas = new Map(); // challengeId => { answer, expires }
const faucetClaims = new Map(); // key (IP or address) => timestamp

// Clean up expired captchas periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, challenge] of captchas.entries()) {
    if (now > challenge.expires) {
      captchas.delete(id);
    }
  }
}, 60000);

// Initialize Faucet Wallet
let faucetWallet = null;
const FAUCET_KEY = process.env.FAUCET_PRIVATE_KEY;
const testnetProvider = new ethers.JsonRpcProvider(TESTNET_RPC, undefined, {
  staticNetwork: new ethers.Network('BOT Chain Testnet', 968)
});

if (FAUCET_KEY) {
  try {
    faucetWallet = new ethers.Wallet(FAUCET_KEY, testnetProvider);
    console.log(`Faucet Relayer Wallet initialized. Address: ${faucetWallet.address}`);
  } catch (err) {
    console.error('Error initializing Faucet Wallet from private key:', err);
  }
} else {
  // Generate a random wallet to avoid crash, and print instructions to console
  const randomWallet = ethers.Wallet.createRandom();
  faucetWallet = new ethers.Wallet(randomWallet.privateKey, testnetProvider);
  console.log(`\n==================================================`);
  console.log(`⚠️ FAUCET_PRIVATE_KEY not set in backend/.env.`);
  console.log(`A temporary faucet wallet has been generated:`);
  console.log(`Address: ${faucetWallet.address}`);
  console.log(`To use the relayer, please fund this address with tBOT on Testnet`);
  console.log(`or configure FAUCET_PRIVATE_KEY inside backend/.env.`);
  console.log(`==================================================\n`);
}

// GET /api/faucet/captcha
app.get('/api/faucet/captcha', (req, res) => {
  try {
    const num1 = Math.floor(Math.random() * 9) + 1; // 1-9
    const num2 = Math.floor(Math.random() * 9) + 1; // 1-9
    const operators = ['+', '-'];
    const op = operators[Math.floor(Math.random() * operators.length)];
    
    let question = '';
    let answer = 0;
    
    if (op === '+') {
      question = `What is ${num1} + ${num2}?`;
      answer = num1 + num2;
    } else {
      // Ensure positive result for simplicity
      const max = Math.max(num1, num2);
      const min = Math.min(num1, num2);
      question = `What is ${max} - ${min}?`;
      answer = max - min;
    }
    
    const challengeId = Math.random().toString(36).substring(2, 15);
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes validity
    
    captchas.set(challengeId, { answer, expires });
    
    res.json({ success: true, challengeId, question });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/faucet/claim
app.post('/api/faucet/claim', async (req, res) => {
  try {
    const { address, challengeId, answer } = req.body;
    
    if (!address || !challengeId || answer === undefined) {
      return res.status(400).json({ error: 'Missing required parameters: address, challengeId, and answer are required.' });
    }
    
    // 1. Verify Captcha
    const challenge = captchas.get(challengeId);
    if (!challenge) {
      return res.status(400).json({ error: 'Captcha challenge expired or invalid. Please request a new one.' });
    }
    
    if (Date.now() > challenge.expires) {
      captchas.delete(challengeId);
      return res.status(400).json({ error: 'Captcha challenge has expired. Please request a new one.' });
    }
    
    if (parseInt(answer) !== challenge.answer) {
      return res.status(400).json({ error: 'Incorrect captcha answer. Please try again.' });
    }
    
    // Clean up used captcha challenge
    captchas.delete(challengeId);
    
    // 2. Verify IP and Address Rate-Limits (Sybil prevention)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const cleanAddress = address.toLowerCase();
    const now = Date.now();
    const rateLimitPeriod = 24 * 60 * 60 * 1000; // 24 hours
    
    const ipLastClaim = faucetClaims.get(`ip_${ip}`);
    if (ipLastClaim && now - ipLastClaim < rateLimitPeriod) {
      const remainingHours = Math.ceil((rateLimitPeriod - (now - ipLastClaim)) / (60 * 60 * 1000));
      return res.status(429).json({ error: `This IP has already claimed tokens recently. Please retry in ${remainingHours} hours.` });
    }
    
    const addrLastClaim = faucetClaims.get(`addr_${cleanAddress}`);
    if (addrLastClaim && now - addrLastClaim < rateLimitPeriod) {
      const remainingHours = Math.ceil((rateLimitPeriod - (now - addrLastClaim)) / (60 * 60 * 1000));
      return res.status(429).json({ error: `This wallet address has already claimed tokens recently. Please retry in ${remainingHours} hours.` });
    }
    
    // 3. Send Transaction
    if (!faucetWallet) {
      return res.status(500).json({ error: 'Faucet relayer wallet is not initialized.' });
    }
    
    console.log(`Relaying claim transaction to transfer 0.1 tBOT to address ${address}`);
    
    // Send 0.1 tBOT
    const tx = await faucetWallet.sendTransaction({
      to: address,
      value: ethers.parseEther('0.1')
    });
    
    // Save claim timestamps immediately to prevent double clicks from bypassing rate limits
    faucetClaims.set(`ip_${ip}`, now);
    faucetClaims.set(`addr_${cleanAddress}`, now);
    
    // Wait for the tx confirmation
    const receipt = await tx.wait();
    
    res.json({
      success: true,
      amount: '0.1 tBOT',
      txHash: receipt.hash
    });
    
  } catch (err) {
    console.error('Faucet relayer claim error:', err);
    res.status(500).json({ error: err.reason || err.message || err });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`BOTFoundry backend listening on http://localhost:${PORT}`);
});
