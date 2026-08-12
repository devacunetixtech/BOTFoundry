import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { API_BASE } from '../config';
import { Award, CheckCircle, Copy, Check, Users } from 'lucide-react';
import { ethers } from 'ethers';

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
}

interface CreatorProfileProps {
  creatorAddress?: string;
  onRunAgent: (agent: Agent) => void;
}

export const CreatorProfile: React.FC<CreatorProfileProps> = ({ 
  creatorAddress, 
  onRunAgent
}) => {
  const { isTestnet, address } = useWallet();
  const [copied, setCopied] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // We determine the active address to display
  const activeAddress = creatorAddress || address || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

  useEffect(() => {
    const fetchCreatorData = async () => {
      if (!activeAddress || activeAddress === '0x71C7656EC7ab88b098defB751B7401B5f6d8976F') {
        return;
      }
      setLoading(true);
      try {
        // Fetch published agents
        const agentsRes = await fetch(`${API_BASE}/api/agents/creator/${activeAddress}?network=${isTestnet ? 'testnet' : 'mainnet'}`);
        if (agentsRes.ok) {
          const agentsData = await agentsRes.json();
          setAgents(agentsData);
        }

        // Fetch analytics
        const analyticsRes = await fetch(`${API_BASE}/api/analytics/${activeAddress}?network=${isTestnet ? 'testnet' : 'mainnet'}`);
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData);
        }
      } catch (error) {
        console.error('Error fetching creator profile details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCreatorData();
  }, [activeAddress, isTestnet]);

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}•••${addr.substring(addr.length - 4)}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalInstalls = analytics ? analytics.totalRequests : agents.reduce((sum, a) => sum + (a.usageCount || 0), 0);
  const totalRevenue = analytics 
    ? parseFloat(ethers.formatEther(analytics.totalEarnings)) 
    : agents.reduce((sum, a) => sum + parseFloat(ethers.formatEther(a.revenueGenerated)), 0);

  const isMe = address && activeAddress.toLowerCase() === address.toLowerCase();
  const displayName = isMe ? 'My Creator Identity' : 'EVM Core Lab';
  const displayAvatar = isMe ? 'ME' : 'DEV';
  const displayBadge = isMe ? 'Active Developer' : 'Verified Creator';

  return (
    <div className="space-y-12">
      
      {/* Profile Header Hero */}
      <section className="glass-panel-subtle p-8 bg-brand-surface border border-brand-border rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-brand-border/80 transition-all duration-300">
        <div className="flex gap-5 items-center">
          <div className="w-16 h-16 rounded-full bg-brand-primary flex items-center justify-center text-brand-bg text-xl font-black">
            {displayAvatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-brand-text-primary">{displayName}</h2>
              <span className="inline-flex items-center gap-1 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wide">
                <CheckCircle size={10} className="fill-current animate-pulse" />
                {displayBadge}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <span className="font-mono text-xs text-brand-text-secondary">{formatAddress(activeAddress)}</span>
              <button 
                onClick={handleCopy}
                className="text-brand-text-secondary hover:text-brand-primary p-1 rounded-md transition-colors"
                title="Copy Wallet Address"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Profile Overview Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-brand-surface border border-brand-border p-5 rounded-2xl">
          <span className="text-[9px] uppercase font-bold text-brand-text-secondary tracking-wider block">Total Installs</span>
          <span className="text-xl font-extrabold text-brand-text-primary mt-2 block font-mono">{totalInstalls}</span>
        </div>
        <div className="bg-brand-surface border border-brand-border p-5 rounded-2xl">
          <span className="text-[9px] uppercase font-bold text-brand-text-secondary tracking-wider block">Total Earnings</span>
          <span className="text-xl font-extrabold text-brand-primary mt-2 block font-mono">
            {totalRevenue.toFixed(3)} <span className="text-xs font-semibold text-brand-text-secondary">{isTestnet ? 'tBOT' : 'BOT'}</span>
          </span>
        </div>
        <div className="bg-brand-surface border border-brand-border p-5 rounded-2xl">
          <span className="text-[9px] uppercase font-bold text-brand-text-secondary tracking-wider block">Active Agents</span>
          <span className="text-xl font-extrabold text-brand-text-primary mt-2 block font-mono">{agents.length}</span>
        </div>
      </section>

      {/* Ecosystem Badges */}
      <section className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-2xl space-y-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Ecosystem Badges</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex gap-3.5 items-start bg-brand-bg border border-brand-border/60 p-4 rounded-xl">
            <Award size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs text-brand-text-primary">EVM Pioneer</h4>
              <p className="text-[10px] text-brand-text-secondary mt-1 font-medium leading-relaxed">Deploys verified, bug-free Solidity auditor agents to the mainnet registry.</p>
            </div>
          </div>

          <div className="flex gap-3.5 items-start bg-brand-bg border border-brand-border/60 p-4 rounded-xl">
            <Users size={18} className="text-brand-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs text-brand-text-primary">High Volume</h4>
              <p className="text-[10px] text-brand-text-secondary mt-1 font-medium leading-relaxed">Exceeded 5,000 successful executions across published catalog.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
