import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import { API_BASE } from '../config';
import { 
  Coins, 
  Cpu, 
  MessageSquare, 
  Plus, 
  DollarSign, 
  ExternalLink, 
  RefreshCw, 
  TrendingUp, 
  Key, 
  BookOpen,
  ArrowRight,
  User,
  Clock,
  Layers,
  ChevronRight,
  Database,
  FileText,
  BadgeAlert
} from 'lucide-react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

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

interface Transaction {
  txHash: string;
  agentId: number;
  userAddress: string;
  amount: string;
  creatorRevenue: string;
  platformFee: string;
  status: string;
  timestamp: string;
}

interface AnalyticsData {
  totalEarnings: string;
  totalRequests: number;
  agentsCount: number;
  agentStats: {
    id: number;
    name: string;
    category: string;
    pricePerRequest: string;
    usageCount: number;
    revenueGenerated: string;
    slug: string;
  }[];
  recentTransactions: Transaction[];
}

interface DashboardProps {
  setCurrentTab: (tab: string) => void;
  onEditAgent: (agent: Agent) => void;
}

// GSAP Animated Counter Component
const AnimatedCounter: React.FC<{
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}> = ({ value, decimals = 0, prefix = '', suffix = '' }) => {
  const elementRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef({ val: 0 });

  useEffect(() => {
    if (elementRef.current) {
      gsap.to(countRef.current, {
        val: value,
        duration: 1.0,
        ease: 'power3.out',
        onUpdate: () => {
          if (elementRef.current) {
            elementRef.current.innerText = prefix + countRef.current.val.toFixed(decimals) + suffix;
          }
        }
      });
    }
  }, [value, decimals, prefix, suffix]);

  return <span ref={elementRef} className="font-mono">{prefix}{value.toFixed(decimals)}{suffix}</span>;
};

export const Dashboard: React.FC<DashboardProps> = ({ setCurrentTab, onEditAgent }) => {
  const { address, balance, isTestnet, connectWallet } = useWallet();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async (silent = false) => {
    if (!address) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/analytics/${address}?network=${isTestnet ? 'testnet' : 'mainnet'}`);
      if (!res.ok) throw new Error('Failed to retrieve analytics metrics');
      const data = await res.json();
      setAnalytics(data);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Could not retrieve analytics from the server.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    // Poll telemetry and analytics data in the background every 5 seconds for real-time updates
    const interval = setInterval(() => {
      fetchAnalytics(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [address, isTestnet]);

  const getNumericValue = (wei: string | undefined): number => {
    try {
      if (!wei) return 0;
      return parseFloat(ethers.formatEther(wei));
    } catch {
      return 0;
    }
  };

  const formatEtherVal = (wei: string) => {
    try {
      return Number(ethers.formatEther(wei)).toFixed(3);
    } catch (e) {
      return '0.000';
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}•••${addr.substring(addr.length - 4)}`;
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (!address) {
    return (
      <div className="glass-panel-subtle p-12 text-center max-w-xl mx-auto my-12 bg-brand-surface border border-brand-border rounded-3xl shadow-sm">
        <Coins size={36} className="text-brand-primary mx-auto mb-4" />
        <h3 className="text-base font-bold text-brand-text-primary">Access Your Developer Dashboard</h3>
        <p className="text-xs text-brand-text-secondary mt-2 leading-relaxed max-w-sm mx-auto">
          Connect your Web3 wallet to manage your AI agents, configure pricing parameters, and view real-time monetization data.
        </p>
        <div className="mt-6">
          <button 
            onClick={connectWallet}
            className="btn-primary select-none cursor-pointer text-xs"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  const earningsValue = analytics ? getNumericValue(analytics.totalEarnings) : 0;
  const requestsValue = analytics ? analytics.totalRequests : 0;
  const agentsValue = analytics ? analytics.agentsCount : 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-12"
    >
      {/* Hero Welcome / Header Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-brand-border/40">
        <div>
          <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest block mb-1">Developer Portal</span>
          <h1 className="text-3xl font-bold tracking-tight text-brand-text-primary">
            Welcome back, <span className="font-mono text-xl text-brand-text-secondary">{formatAddress(address)}</span>
          </h1>
          <p className="text-xs text-brand-text-secondary mt-1">
            Build and monitor smart AI agents deployed on BOT Chain. Track revenue, usage stats, and payouts.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button 
            onClick={() => fetchAnalytics()}
            className="btn-secondary select-none cursor-pointer text-xs"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh telemetry
          </button>
          <button 
            onClick={() => setCurrentTab('builder')}
            className="btn-primary select-none cursor-pointer text-xs"
          >
            <Plus size={13} />
            Build Agent
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 border border-rose-500/20 bg-rose-500/5 p-3.5 rounded-2xl text-xs text-rose-400">
          <span>⚠ {error}</span>
        </div>
      )}

      {/* Elegant Statistics Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Wallet Pill / Balance */}
        <div className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-2xl flex flex-col justify-between hover:border-brand-border/80 transition-all duration-300">
          <div className="flex items-center justify-between text-brand-text-secondary">
            <span className="text-[10px] uppercase font-bold tracking-wider">Wallet Balance</span>
            <Coins size={14} className="text-brand-primary" />
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-brand-text-primary">
              <AnimatedCounter value={parseFloat(balance) || 0} decimals={3} />
              <span className="text-xs text-brand-text-secondary font-medium ml-1.5">{isTestnet ? 'tBOT' : 'BOT'}</span>
            </div>
            <span className="text-[10px] text-brand-text-secondary block mt-1.5 font-medium">BOT Chain {isTestnet ? 'Testnet' : 'Mainnet'} EVM Address</span>
          </div>
        </div>

        {/* Monthly Revenue / Total Earnings */}
        <div className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-2xl flex flex-col justify-between hover:border-brand-border/80 transition-all duration-300">
          <div className="flex items-center justify-between text-brand-text-secondary">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Revenue</span>
            <DollarSign size={14} className="text-brand-primary" />
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-brand-primary">
              <AnimatedCounter value={earningsValue} decimals={3} />
              <span className="text-xs text-brand-text-secondary font-medium ml-1.5">{isTestnet ? 'tBOT' : 'BOT'}</span>
            </div>
            <span className="text-[10px] text-brand-text-secondary block mt-1.5 font-medium">95% Creator share settled ({isTestnet ? 'Testnet' : 'Mainnet'})</span>
          </div>
        </div>

        {/* Total Deployments */}
        <div className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-2xl flex flex-col justify-between hover:border-brand-border/80 transition-all duration-300">
          <div className="flex items-center justify-between text-brand-text-secondary">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Deployments</span>
            <Cpu size={14} className="text-brand-primary" />
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-brand-text-primary">
              <AnimatedCounter value={agentsValue} />
              <span className="text-xs text-brand-text-secondary font-medium ml-1.5">Agents</span>
            </div>
            <span className="text-[10px] text-brand-text-secondary block mt-1.5 font-medium">Active smart contract models ({isTestnet ? 'Testnet' : 'Mainnet'})</span>
          </div>
        </div>

        {/* Active Conversations / Total Executions */}
        <div className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-2xl flex flex-col justify-between hover:border-brand-border/80 transition-all duration-300">
          <div className="flex items-center justify-between text-brand-text-secondary">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Executions</span>
            <MessageSquare size={14} className="text-brand-primary" />
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-brand-text-primary">
              <AnimatedCounter value={requestsValue} />
              <span className="text-xs text-brand-text-secondary font-medium ml-1.5">Requests</span>
            </div>
            <span className="text-[10px] text-brand-text-secondary block mt-1.5 font-medium">On-chain validation success ({isTestnet ? 'Testnet' : 'Mainnet'})</span>
          </div>
        </div>
      </section>

      {/* Quick Actions Grid */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">System Command Center</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <button 
            onClick={() => setCurrentTab('builder')}
            className="glass-panel-subtle p-5 bg-brand-surface hover:bg-brand-elevated border border-brand-border rounded-2xl text-left select-none cursor-pointer transition-all duration-300 group"
          >
            <div className="w-8 h-8 rounded-full bg-brand-bg flex items-center justify-center text-brand-primary group-hover:scale-105 transition-transform duration-300">
              <Plus size={14} />
            </div>
            <div className="font-semibold text-xs text-brand-text-primary mt-4">Create Agent</div>
            <div className="text-[10px] text-brand-text-secondary mt-1">Design and deploy fresh model identities</div>
          </button>
 
          <button 
            onClick={() => setCurrentTab('analytics')}
            className="glass-panel-subtle p-5 bg-brand-surface hover:bg-brand-elevated border border-brand-border rounded-2xl text-left select-none cursor-pointer transition-all duration-300 group"
          >
            <div className="w-8 h-8 rounded-full bg-brand-bg flex items-center justify-center text-brand-primary group-hover:scale-105 transition-transform duration-300">
              <TrendingUp size={14} />
            </div>
            <div className="font-semibold text-xs text-brand-text-primary mt-4">Telemetry Analytics</div>
            <div className="text-[10px] text-brand-text-secondary mt-1">Explore interaction volume & latency graphs</div>
          </button>
 
          <button 
            onClick={() => setCurrentTab('knowledge-manager')}
            className="glass-panel-subtle p-5 bg-brand-surface hover:bg-brand-elevated border border-brand-border rounded-2xl text-left select-none cursor-pointer transition-all duration-300 group"
          >
            <div className="w-8 h-8 rounded-full bg-brand-bg flex items-center justify-center text-brand-primary group-hover:scale-105 transition-transform duration-300">
              <Database size={14} />
            </div>
            <div className="font-semibold text-xs text-brand-text-primary mt-4">Knowledge Base</div>
            <div className="text-[10px] text-brand-text-secondary mt-1">Manage vector database document embeddings</div>
          </button>
        </div>
      </section>

      {/* Main Grid: Left My Deployed Agents Table, Right On-Chain Payout History */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Deployed Agents List (Span 2) */}
        <div className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-2xl lg:col-span-2 hover:border-brand-border/80 transition-all duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-semibold text-brand-text-primary">Deployed AI Identities</h3>
            <span className="text-[10px] text-brand-text-secondary font-medium">On-chain active listings</span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 rounded-full border-2 border-brand-border border-t-brand-primary animate-spin" />
              <span className="text-xs text-brand-text-secondary">Syncing registry...</span>
            </div>
          ) : !analytics || analytics.agentStats.length === 0 ? (
            <div className="py-12 text-center text-xs text-brand-text-secondary space-y-3">
              <Cpu size={20} className="text-brand-text-secondary mx-auto" />
              <p>You have not registered any AI agents yet. Get started by deploying your first model identity.</p>
              <button 
                onClick={() => setCurrentTab('builder')}
                className="btn-secondary select-none cursor-pointer text-xs"
              >
                Build Agent
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-brand-border/60 text-brand-text-secondary pb-3">
                    <th className="py-3 font-semibold">IDENTITY</th>
                    <th className="py-3 font-semibold">CATEGORY</th>
                    <th className="py-3 font-semibold">PRICE</th>
                    <th className="py-3 font-semibold">EXECUTIONS</th>
                    <th className="py-3 font-semibold">REVENUE</th>
                    <th className="py-3 font-semibold text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.agentStats.map((agent) => (
                    <tr key={agent.id} className="border-b border-brand-border/40 hover:bg-brand-bg/30 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center text-sm font-semibold">
                            🤖
                          </div>
                          <div>
                            <span className="font-bold text-brand-text-primary text-xs">{agent.name}</span>
                            <span className="text-[9px] text-brand-text-secondary block font-mono">v1.0.0 • ID: #{agent.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="bg-brand-bg border border-brand-border/60 text-brand-text-primary text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">
                          {agent.category}
                        </span>
                      </td>
                      <td className="py-4 font-mono font-semibold text-brand-primary">
                        {parseFloat(agent.pricePerRequest) === 0 ? 'Free' : `${formatEtherVal(agent.pricePerRequest)} ${isTestnet ? 'tBOT' : 'BOT'}`}
                      </td>
                      <td className="py-4 text-brand-text-secondary font-mono">{agent.usageCount || 0}</td>
                      <td className="py-4 font-semibold text-brand-text-primary font-mono">
                        {formatEtherVal(agent.revenueGenerated)} {isTestnet ? 'tBOT' : 'BOT'}
                      </td>
                      <td className="py-4 text-right">
                        <button 
                          onClick={() => {
                            const fullAgent: Agent = {
                              id: agent.id,
                              name: agent.name,
                              description: "Interactive AI Agent on BOT Chain L1.",
                              category: agent.category,
                              systemPrompt: "Personality and logic rules...",
                              pricePerRequest: agent.pricePerRequest,
                              metadataURI: "",
                              avatar: "🤖",
                              creator: address!,
                              isActive: true,
                              slug: agent.slug,
                              usageCount: agent.usageCount,
                              revenueGenerated: agent.revenueGenerated
                            };
                            onEditAgent(fullAgent);
                          }}
                          className="btn-secondary select-none cursor-pointer text-[10px] !px-3.5 !py-1.5"
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Payouts / Transactions List */}
        <div className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-2xl hover:border-brand-border/80 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-semibold text-brand-text-primary">On-Chain Payouts</h3>
              <span className="text-[10px] text-brand-text-secondary font-medium">Settled in real-time</span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-brand-text-secondary">Syncing ledger logs...</div>
            ) : !analytics || analytics.recentTransactions.length === 0 ? (
              <div className="py-12 text-center text-xs text-brand-text-secondary">
                No recent payment transactions detected on-chain.
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.recentTransactions.map((tx) => (
                  <div key={tx.txHash} className="flex items-start justify-between bg-brand-bg/50 border border-brand-border/50 p-3 rounded-xl gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary mt-0.5">
                        <Coins size={12} />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-brand-text-primary">Payout Agent #{tx.agentId}</div>
                        <div className="text-[9px] text-brand-text-secondary mt-0.5 leading-none">
                          From: {formatAddress(tx.userAddress)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right flex flex-col items-end">
                      <span className="text-xs font-bold text-brand-primary font-mono">+{formatEtherVal(tx.creatorRevenue)}</span>
                      <a 
                        href={isTestnet ? `https://scan.bohr.life/tx/${tx.txHash}` : `https://scan.botchain.ai/tx/${tx.txHash}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[9px] text-brand-text-secondary hover:text-brand-primary flex items-center gap-0.5 mt-1"
                      >
                        Tx hash <ExternalLink size={8} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-brand-border/50 pt-4 mt-6">
            <a 
              href={isTestnet ? "https://scan.bohr.life" : "https://scan.botchain.ai"} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-secondary w-full text-xs select-none cursor-pointer flex items-center justify-center gap-1"
            >
              <span>Verify on Block Explorer</span>
              <ArrowRight size={11} className="text-brand-text-secondary" />
            </a>
          </div>
        </div>
      </section>
    </motion.div>
  );
};
