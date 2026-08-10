import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { API_BASE } from '../config';
import { 
  ArrowLeft, 
  Settings, 
  TrendingUp, 
  Database, 
  Coins, 
  GitBranch, 
  Cpu, 
  CheckCircle, 
  Copy, 
  Check, 
  ExternalLink,
  Code,
  Shield,
  Activity,
  Play,
  FileText
} from 'lucide-react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';

interface Agent {
  id: number;
  name: string;
  description: string;
  category: string;
  systemPrompt: string;
  pricePerRequest: string;
  metadataURI: string;
  avatar: string;
  creator: string;
  isActive: boolean;
  slug: string;
  usageCount: number;
  revenueGenerated: string;
  rating?: number;
  installs?: number;
}

interface AgentDetailsProps {
  agent: Agent;
  onBack: () => void;
  onRunAgent: (agent: Agent) => void;
}

export const AgentDetails: React.FC<AgentDetailsProps> = ({ agent, onBack, onRunAgent }) => {
  const { address, isTestnet, updateAgentOnChain } = useWallet();
  const [activeTab, setActiveTab] = useState<'overview' | 'config' | 'analytics' | 'knowledge' | 'pricing' | 'deployments' | 'versions'>('overview');
  
  // State for Configuration edit fields
  const [name, setName] = useState(agent.name);
  const [desc, setDesc] = useState(agent.description);
  const [prompt, setPrompt] = useState(agent.systemPrompt);
  const [price, setPrice] = useState(ethers.formatEther(agent.pricePerRequest));
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async (updatedPrice?: string, updatedName?: string, updatedPrompt?: string, updatedDesc?: string) => {
    if (!address) {
      alert('Please connect your EVM wallet first.');
      return;
    }
    if (address.toLowerCase() !== agent.creator.toLowerCase()) {
      alert('Only the agent creator can modify this agent.');
      return;
    }

    setUpdating(true);
    try {
      const activePrice = updatedPrice !== undefined ? updatedPrice : price;
      const activeName = updatedName !== undefined ? updatedName : name;
      const activePrompt = updatedPrompt !== undefined ? updatedPrompt : prompt;
      const activeDesc = updatedDesc !== undefined ? updatedDesc : desc;

      const priceWei = ethers.parseEther(activePrice || '0').toString();

      // Build metadata JSON
      const metadataJson = {
        name: activeName,
        description: activeDesc,
        category: agent.category,
        avatar: agent.avatar,
        systemPrompt: activePrompt,
        pricePerRequest: priceWei,
        createdAt: new Date().toISOString(),
        platform: 'BOTFoundry',
        version: '1.0'
      };
      const metadataURI = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(metadataJson))}`;

      console.log('Sending transaction to update agent on-chain...');
      const txHash = await updateAgentOnChain(
        agent.id,
        activeName,
        agent.category,
        priceWei,
        metadataURI,
        agent.isActive
      );

      console.log('On-chain update success. Tx Hash:', txHash);

      // Save to backend API
      const backendRes = await fetch(`${API_BASE}/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: activeName,
          description: activeDesc,
          category: agent.category,
          systemPrompt: activePrompt,
          pricePerRequest: priceWei,
          metadataURI,
          avatar: agent.avatar,
          isActive: agent.isActive,
          creator: address.toLowerCase(),
          network: isTestnet ? 'testnet' : 'mainnet'
        })
      });

      if (!backendRes.ok) {
        throw new Error('On-chain update succeeded, but backend database synchronization failed.');
      }

      // Sync the local model
      agent.name = activeName;
      agent.description = activeDesc;
      agent.pricePerRequest = priceWei;
      agent.systemPrompt = activePrompt;
      
      alert('Agent updated successfully on-chain and database synchronized!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to update agent');
    } finally {
      setUpdating(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}•••${addr.substring(addr.length - 4)}`;
  };

  const formatPrice = (wei: string) => {
    if (wei === '0') return 'Free';
    return `${ethers.formatEther(wei)} ${isTestnet ? 'tBOT' : 'BOT'}`;
  };

  const apiEndpointUrl = `https://api.botchain.ai/v1/gateway/agent/${agent.id}/query`;
  const curlCodeSnippet = `curl -X POST "${apiEndpointUrl}" \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Identify vulnerabilities in the provided smart contract code...",
    "userAddress": "${address || '0x...'}"
  }'`;

  const nodeCodeSnippet = `const axios = require('axios');

axios.post('${apiEndpointUrl}', {
  prompt: 'Draft an ERC20 smart contract...',
  userAddress: '${address || '0x...'}'
}, {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
}).then(res => console.log(res.data.output));`;

  return (
    <div className="space-y-10">
      
      {/* Back button */}
      <button 
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-text-secondary hover:text-brand-text-primary transition-colors cursor-pointer select-none"
      >
        <ArrowLeft size={13} />
        Back to Dashboard
      </button>

      {/* Hero Header Section */}
      <section className="glass-panel-subtle p-8 bg-brand-surface border border-brand-border rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-brand-border/80 transition-all duration-300">
        <div className="flex gap-5 items-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-bg border border-brand-border flex items-center justify-center text-3xl flex-shrink-0">
            {agent.avatar || '🤖'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-brand-text-primary">{agent.name}</h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wide ${
                agent.isActive 
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                  : 'bg-brand-border text-brand-text-secondary border border-brand-border'
              }`}>
                <span className={`w-1 h-1 rounded-full ${agent.isActive ? 'bg-emerald-400' : 'bg-brand-text-secondary'}`} />
                {agent.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs text-brand-text-secondary mt-1 max-w-xl font-medium leading-relaxed">{agent.description}</p>
            <div className="flex items-center gap-4 text-[10px] text-brand-text-secondary mt-3.5 font-medium">
              <span>Creator: <span className="font-mono text-brand-text-primary">{formatAddress(agent.creator)}</span></span>
              <span>•</span>
              <span>Version: <span className="text-brand-text-primary">v1.0.0</span></span>
              <span>•</span>
              <span>Category: <span className="text-brand-text-primary">{agent.category}</span></span>
            </div>
          </div>
        </div>

        <div className="flex flex-row md:flex-col gap-3.5 items-end justify-between w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-brand-border/40">
          <div className="text-right">
            <span className="text-[9px] uppercase font-bold tracking-wider text-brand-text-secondary block">Total Revenue Generated</span>
            <span className="text-xl font-extrabold text-brand-primary tracking-tight font-mono">
              {Number(ethers.formatEther(agent.revenueGenerated)).toFixed(2)} <span className="text-xs">{isTestnet ? 'tBOT' : 'BOT'}</span>
            </span>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => onRunAgent(agent)}
              className="inline-flex items-center gap-1.5 bg-brand-text-primary hover:bg-brand-text-primary/95 text-brand-bg px-4.5 py-2.5 rounded-full text-xs font-bold select-none cursor-pointer transition-all shadow-sm"
            >
              <Play size={11} className="fill-current" />
              Interact with Agent
            </button>
          </div>
        </div>
      </section>

      {/* Navigation Tabs (OpenAI Playground style) */}
      <div className="flex border-b border-brand-border/40 pb-px overflow-x-auto gap-2">
        {(['overview', 'config', 'analytics', 'knowledge', 'pricing', 'deployments', 'versions'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer select-none whitespace-nowrap ${
              activeTab === tab 
                ? 'border-brand-primary text-brand-text-primary font-bold' 
                : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        
        {/* OVERVIEW PANEL */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-2xl lg:col-span-2 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-brand-text-primary">Ecosystem Statistics</h3>
                <div className="grid grid-cols-3 gap-6 mt-4">
                  <div className="bg-brand-bg border border-brand-border/60 p-4 rounded-xl">
                    <span className="text-[9px] uppercase font-bold text-brand-text-secondary tracking-wider block">Total Installs</span>
                    <span className="text-lg font-bold text-brand-text-primary mt-1.5 block font-mono">{agent.installs || 120}</span>
                  </div>
                  <div className="bg-brand-bg border border-brand-border/60 p-4 rounded-xl">
                    <span className="text-[9px] uppercase font-bold text-brand-text-secondary tracking-wider block">Average Rating</span>
                    <span className="text-lg font-bold text-brand-text-primary mt-1.5 block font-mono">⭐ {agent.rating || '4.8'}</span>
                  </div>
                  <div className="bg-brand-bg border border-brand-border/60 p-4 rounded-xl">
                    <span className="text-[9px] uppercase font-bold text-brand-text-secondary tracking-wider block">Usage Executions</span>
                    <span className="text-lg font-bold text-brand-text-primary mt-1.5 block font-mono">{agent.usageCount || 0}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-brand-border/50 pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-brand-text-primary">API Gateway Integration</h3>
                <p className="text-xs text-brand-text-secondary leading-relaxed font-medium">
                  Trigger inquiries to your deployed agent programmatically using the public BOT Chain API gateway.
                </p>

                <div className="bg-brand-bg border border-brand-border p-4 rounded-xl space-y-3 font-mono text-[10px] text-brand-text-secondary overflow-x-auto">
                  <div className="flex justify-between items-center text-xs border-b border-brand-border/60 pb-2">
                    <span className="font-bold text-brand-text-primary text-[10px]">CURL ENDPOINT REQUEST</span>
                    <button 
                      onClick={() => handleCopy(curlCodeSnippet, 'curl')}
                      className="flex items-center gap-1 hover:text-brand-primary"
                    >
                      {copiedText === 'curl' ? <Check size={11} className="text-brand-primary" /> : <Copy size={11} />}
                      {copiedText === 'curl' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="leading-relaxed">{curlCodeSnippet}</pre>
                </div>
              </div>
            </div>

            {/* Right details sidebar */}
            <div className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-2xl h-fit space-y-6">
              <h3 className="text-sm font-semibold text-brand-text-primary">Deployment Details</h3>
              <div className="space-y-4 text-xs font-medium">
                <div className="flex justify-between">
                  <span className="text-brand-text-secondary">EVM Contract CA:</span>
                  <span className="font-mono text-brand-text-primary text-[11px] hover:text-brand-primary cursor-pointer flex items-center gap-0.5">
                    {formatAddress(window.ethereum ? '0xD5452816194a3784dBa983426cCe7c122F4abd30' : '0x546307af427902A75771434Df831d88219784E19')}
                    <ExternalLink size={10} />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-text-secondary">Chain ID:</span>
                  <span className="font-mono text-brand-text-primary text-[11px]">{isTestnet ? '968 (tBOT)' : '677 (BOT)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-text-secondary">Metadata Hash:</span>
                  <span className="font-mono text-brand-text-primary text-[11px] hover:underline cursor-pointer">
                    QmMockHash...
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONFIGURATION PANEL */}
        {activeTab === 'config' && (
          <div className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-2xl max-w-2xl space-y-6">
            <h3 className="text-sm font-semibold text-brand-text-primary">Configure Identity Instructions</h3>
            
            {(!address || address.toLowerCase() !== agent.creator.toLowerCase()) && (
              <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-xl text-xs text-amber-500 font-semibold">
                Only the creator of this agent can modify its settings and instructions.
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">Agent Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                disabled={!address || address.toLowerCase() !== agent.creator.toLowerCase() || updating}
                className="w-full bg-brand-bg/50 border border-brand-border px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-brand-primary text-brand-text-primary disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">Short Description</label>
              <textarea 
                value={desc} 
                onChange={(e) => setDesc(e.target.value)} 
                disabled={!address || address.toLowerCase() !== agent.creator.toLowerCase() || updating}
                className="w-full bg-brand-bg/50 border border-brand-border px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-brand-primary text-brand-text-primary min-h-[70px] resize-none disabled:opacity-60"
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">System Prompt instructions</label>
              <textarea 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)} 
                disabled={!address || address.toLowerCase() !== agent.creator.toLowerCase() || updating}
                className="w-full bg-brand-bg/50 border border-brand-border px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-brand-primary text-brand-text-primary min-h-[140px] disabled:opacity-60"
              />
            </div>

            {address && address.toLowerCase() === agent.creator.toLowerCase() && (
              <button 
                onClick={() => handleUpdate(price, name, prompt, desc)}
                disabled={updating}
                className="bg-brand-text-primary text-brand-bg hover:bg-brand-text-primary/90 px-6 py-2.5 rounded-full text-xs font-bold cursor-pointer transition-all shadow-sm disabled:opacity-50"
              >
                {updating ? 'Saving...' : 'Save Configuration'}
              </button>
            )}
          </div>
        )}

        {/* ANALYTICS PANEL */}
        {activeTab === 'analytics' && (
          <div className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-brand-text-primary">Interaction Latency & Request Logs</h3>
              <span className="text-[10px] text-brand-text-secondary font-medium">Last 30 Days</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-brand-bg border border-brand-border/60 p-5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-brand-text-secondary tracking-wider block">Weekly Requests</span>
                <span className="text-2xl font-bold text-brand-text-primary mt-3 block font-mono">140</span>
              </div>
              <div className="bg-brand-bg border border-brand-border/60 p-5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-brand-text-secondary tracking-wider block">Average response time</span>
                <span className="text-2xl font-bold text-brand-primary mt-3 block font-mono">1.84s</span>
              </div>
              <div className="bg-brand-bg border border-brand-border/60 p-5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-brand-text-secondary tracking-wider block">Inference success rate</span>
                <span className="text-2xl font-bold text-brand-text-primary mt-3 block font-mono">99.8%</span>
              </div>
            </div>
          </div>
        )}

        {/* KNOWLEDGE PANEL */}
        {activeTab === 'knowledge' && (
          <div className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-2xl max-w-xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-brand-text-primary">Connected Vector Knowledge</h3>
              <button 
                onClick={() => alert('Adding new knowledge source index...')}
                className="bg-brand-bg hover:bg-brand-elevated border border-brand-border px-3.5 py-1.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer"
              >
                Connect Index
              </button>
            </div>

            <div className="space-y-3 text-xs font-semibold">
              <div className="bg-brand-bg border border-brand-border/50 p-4 rounded-xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Database size={15} className="text-brand-primary" />
                  <div>
                    <span className="text-brand-text-primary text-xs">solidity-audit-faq</span>
                    <span className="text-[9px] text-brand-text-secondary block mt-0.5">Vector Index • 2.4MB • synced 10m ago</span>
                  </div>
                </div>
                <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full">
                  Synced
                </span>
              </div>
            </div>
          </div>
        )}

        {/* PRICING PANEL */}
        {activeTab === 'pricing' && (
          <div className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-2xl max-w-xl space-y-6">
            <h3 className="text-sm font-semibold text-brand-text-primary">Update Pricing Rate</h3>
            
            {(!address || address.toLowerCase() !== agent.creator.toLowerCase()) && (
              <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-xl text-xs text-amber-500 font-semibold">
                Only the creator of this agent can update its pay-per-request pricing rate.
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">Price per Request ({isTestnet ? 'tBOT' : 'BOT'})</label>
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  step="0.01" 
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={!address || address.toLowerCase() !== agent.creator.toLowerCase() || updating}
                  className="bg-brand-bg/50 border border-brand-border px-4 py-2.5 rounded-xl text-base font-bold focus:outline-none focus:border-brand-primary text-brand-text-primary w-full max-w-[200px] disabled:opacity-60"
                />
                <span className="font-bold text-xs text-brand-text-primary">{isTestnet ? 'tBOT' : 'BOT'}</span>
              </div>
            </div>

            {address && address.toLowerCase() === agent.creator.toLowerCase() && (
              <button 
                onClick={() => handleUpdate(price, name, prompt, desc)}
                disabled={updating}
                className="bg-brand-text-primary text-brand-bg hover:bg-brand-text-primary/90 px-6 py-2.5 rounded-full text-xs font-bold cursor-pointer transition-all shadow-sm disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Pricing'}
              </button>
            )}
          </div>
        )}

        {/* DEPLOYMENTS PANEL */}
        {activeTab === 'deployments' && (
          <div className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-2xl space-y-6">
            <h3 className="text-sm font-semibold text-brand-text-primary">Contract Registry History</h3>
            
            <div className="space-y-4">
              <div className="bg-brand-bg border border-brand-border/60 p-4 rounded-xl flex justify-between items-center text-xs font-medium">
                <div>
                  <span className="font-bold text-brand-text-primary block text-xs">Registry Created</span>
                  <span className="text-[10px] text-brand-text-secondary mt-1 block">Tx: 0xfa8b9c0d1e2f3a4b5c6d7e8f...</span>
                </div>
                <span className="text-[10px] text-brand-text-secondary">Block #849201</span>
              </div>
            </div>
          </div>
        )}

        {/* VERSIONS PANEL */}
        {activeTab === 'versions' && (
          <div className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-2xl max-w-xl space-y-6">
            <h3 className="text-sm font-semibold text-brand-text-primary">Version Branches</h3>

            <div className="space-y-3 text-xs font-semibold">
              <div className="bg-brand-bg border border-brand-border/50 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-brand-text-primary text-xs">v1.0.0</span>
                  <span className="text-[9px] text-brand-text-secondary block mt-0.5">Deployed by creator 0x71c7...</span>
                </div>
                <span className="text-[10px] text-brand-text-secondary">Active version</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
