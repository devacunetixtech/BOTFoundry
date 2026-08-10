import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { connectDb, db } from './db.js';

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

// Start Express Server
app.listen(PORT, () => {
  console.log(`BOTFoundry backend listening on http://localhost:${PORT}`);
});
