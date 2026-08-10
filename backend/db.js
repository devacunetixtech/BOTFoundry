import mongoose from 'mongoose';

// MongoDB schemas
const AgentSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true },
  systemPrompt: { type: String, required: true },
  pricePerRequest: { type: String, required: true }, // Store as string to handle big number / decimals
  metadataURI: { type: String },
  avatar: { type: String }, // Base64 or URL
  creator: { type: String, required: true }, // Wallet address
  isActive: { type: Boolean, default: true },
  slug: { type: String, required: true },
  usageCount: { type: Number, default: 0 },
  revenueGenerated: { type: String, default: '0' }, // Store as string
  network: { type: String, default: 'mainnet' }
}, { timestamps: true });

// Define compound indexes for multi-network uniqueness
AgentSchema.index({ id: 1, network: 1 }, { unique: true });
AgentSchema.index({ slug: 1, network: 1 }, { unique: true });

const ConversationSchema = new mongoose.Schema({
  userAddress: { type: String, required: true },
  agentId: { type: Number, required: true },
  network: { type: String, default: 'mainnet' },
  messages: [{
    role: { type: String, enum: ['user', 'model'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const TransactionSchema = new mongoose.Schema({
  txHash: { type: String, required: true, unique: true },
  agentId: { type: Number, required: true },
  userAddress: { type: String, required: true },
  amount: { type: String, required: true },
  creatorRevenue: { type: String, required: true },
  platformFee: { type: String, required: true },
  status: { type: String, default: 'verified' }, // verified, failed
  network: { type: String, default: 'mainnet' },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

let AgentModel, ConversationModel, TransactionModel;

export async function connectDb(mongoUri) {
  if (!mongoUri) {
    throw new Error('MONGO_URI is not defined in the environment variables.');
  }
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log('Successfully connected to MongoDB.');
  AgentModel = mongoose.model('Agent', AgentSchema);
  ConversationModel = mongoose.model('Conversation', ConversationSchema);
  TransactionModel = mongoose.model('Transaction', TransactionSchema);
}

// Database Actions Wrapper
export const db = {
  // --- AGENTS ---
  async getAgents(query = {}) {
    return await AgentModel.find(query).sort({ createdAt: -1 });
  },

  async getAgentById(id, network = 'mainnet') {
    const numId = Number(id);
    return await AgentModel.findOne({ id: numId, network });
  },

  async getAgentBySlug(slug, network) {
    const query = { slug };
    if (network) query.network = network;
    return await AgentModel.findOne(query);
  },

  async createAgent(agentData) {
    const agent = new AgentModel({
      ...agentData,
      network: agentData.network || 'mainnet'
    });
    return await agent.save();
  },

  async updateAgent(id, updateData) {
    const numId = Number(id);
    const network = updateData.network || 'mainnet';
    return await AgentModel.findOneAndUpdate({ id: numId, network }, updateData, { new: true });
  },

  async incrementAgentUsage(id, paymentAmount, creatorRevenue, platformFee, network = 'mainnet') {
    const numId = Number(id);
    const agent = await AgentModel.findOne({ id: numId, network });
    if (agent) {
      agent.usageCount += 1;
      const currentRev = BigInt(agent.revenueGenerated || '0');
      const addedRev = BigInt(creatorRevenue || '0');
      agent.revenueGenerated = (currentRev + addedRev).toString();
      await agent.save();
    }
  },

  // --- CONVERSATIONS ---
  async getConversation(userAddress, agentId, network = 'mainnet') {
    const numAgentId = Number(agentId);
    return await ConversationModel.findOne({
      userAddress: userAddress.toLowerCase(),
      agentId: numAgentId,
      network
    });
  },

  async saveConversation(userAddress, agentId, messages, network = 'mainnet') {
    const numAgentId = Number(agentId);
    const cleanedAddress = userAddress.toLowerCase();
    
    let conv = await ConversationModel.findOne({
      userAddress: cleanedAddress,
      agentId: numAgentId,
      network
    });
    if (conv) {
      conv.messages = messages;
      return await conv.save();
    } else {
      conv = new ConversationModel({
        userAddress: cleanedAddress,
        agentId: numAgentId,
        messages,
        network
      });
      return await conv.save();
    }
  },

  // --- TRANSACTIONS ---
  async isTxProcessed(txHash) {
    const cleanHash = txHash.toLowerCase();
    const tx = await TransactionModel.findOne({ txHash: cleanHash });
    return !!tx;
  },

  async recordTransaction(txData) {
    const cleanHash = txData.txHash.toLowerCase();
    const data = {
      ...txData,
      txHash: cleanHash,
      network: txData.network || 'mainnet'
    };
    const tx = new TransactionModel(data);
    return await tx.save();
  },

  async getTransactions(query = {}) {
    return await TransactionModel.find(query).sort({ timestamp: -1 });
  }
};
