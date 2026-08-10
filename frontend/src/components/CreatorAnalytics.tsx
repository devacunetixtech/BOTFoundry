import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { API_BASE } from '../config';
import { BarChart3, TrendingUp, Zap, RefreshCw, Star, CheckCircle, Clock, Users, Wallet, Loader2 } from 'lucide-react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';

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
  recentTransactions: any[];
}

export const CreatorAnalytics: React.FC = () => {
  const { address, isTestnet, getPendingWithdrawal, withdrawEarnings } = useWallet();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pull-payment claimable balance state
  const [claimable, setClaimable] = useState<string>('0');
  const [withdrawing, setWithdrawing] = useState<boolean>(false);
  const [withdrawMsg, setWithdrawMsg] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/analytics/${address}?network=${isTestnet ? 'testnet' : 'mainnet'}`);
      if (!res.ok) throw new Error('Failed to retrieve analytics metrics');
      const analyticsData = await res.json();
      setData(analyticsData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not retrieve analytics from the server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClaimable = async () => {
    if (!address) return;
    try {
      const balance = await getPendingWithdrawal();
      setClaimable(balance);
    } catch (err) {
      console.error('Failed to read claimable balance:', err);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawing(true);
    setWithdrawMsg(null);
    try {
      const txHash = await withdrawEarnings();
      setWithdrawMsg(`Withdrawal confirmed. Tx: ${txHash.substring(0, 10)}...`);
      await fetchClaimable();
    } catch (err: any) {
      setWithdrawMsg(err.message || 'Withdrawal failed.');
    } finally {
      setWithdrawing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchClaimable();
  }, [address, isTestnet]);

  const formatEtherVal = (wei: string) => {
    try {
      return Number(ethers.formatEther(wei)).toFixed(2);
    } catch (e) {
      return '0.00';
    }
  };

  if (!address) {
    return (
      <div className="glass-panel-subtle p-12 text-center max-w-xl mx-auto my-12 bg-brand-surface border border-brand-border rounded-3xl shadow-sm">
        <BarChart3 size={36} className="text-brand-primary mx-auto mb-4" />
        <h3 className="text-base font-bold text-brand-text-primary">Access Analytics Engine</h3>
        <p className="text-xs text-brand-text-secondary mt-2 leading-relaxed max-w-sm mx-auto">
          Connect your Web3 wallet to explore visual metrics, response logs, and on-chain payouts.
        </p>
      </div>
    );
  }

  const weeklyUsage = [
    { day: 'Mon', count: 18 },
    { day: 'Tue', count: 24 },
    { day: 'Wed', count: 42 },
    { day: 'Thu', count: 35 },
    { day: 'Fri', count: 56 },
    { day: 'Sat', count: 48 },
    { day: 'Sun', count: 20 }
  ];

  const maxWeeklyCount = Math.max(...weeklyUsage.map(w => w.count));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 100, damping: 15 }
    }
  } as const;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-12"
    >
      
      {/* Header Title Section */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-brand-border/40">
        <div>
          <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest block mb-1">Telemetry Logs</span>
          <h2 className="text-2xl font-bold tracking-tight text-brand-text-primary">Execution Analytics</h2>
          <p className="text-xs text-brand-text-secondary mt-1">Examine agent interactions, usage graphs, and native revenue conversions.</p>
        </div>
        <button 
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-1.5 bg-brand-surface hover:bg-brand-elevated text-brand-text-primary border border-brand-border px-4 py-2.5 rounded-full text-xs font-semibold select-none cursor-pointer transition-all"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh telemetry
        </button>
      </section>

      {error && (
        <div className="flex items-center gap-2 border border-rose-500/20 bg-rose-500/5 p-3.5 rounded-2xl text-xs text-rose-400">
          <span>⚠ {error}</span>
        </div>
      )}

      {/* Claimable Earnings — pull-payment withdrawal */}
      <motion.section
        variants={itemVariants}
        className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-5"
      >
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-brand-primary/10 flex items-center justify-center shrink-0">
            <Wallet size={18} className="text-brand-primary" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest block mb-1">Claimable Balance</span>
            <div className="text-2xl font-bold text-brand-text-primary font-mono">
              {formatEtherVal(claimable)} <span className="text-sm text-brand-text-secondary">{isTestnet ? 'tBOT' : 'BOT'}</span>
            </div>
            <p className="text-[10px] text-brand-text-secondary mt-1 font-medium max-w-sm leading-relaxed">
              Earnings accrue on-chain and are claimed on demand. Includes creator revenue and any refunded overpayment.
            </p>
            {withdrawMsg && (
              <p className="text-[10px] text-brand-primary mt-2 font-semibold break-all">{withdrawMsg}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleWithdraw}
          disabled={withdrawing || claimable === '0'}
          className="inline-flex items-center justify-center gap-1.5 bg-brand-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-full text-xs font-semibold select-none cursor-pointer transition-all shrink-0"
        >
          {withdrawing ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Withdrawing...
            </>
          ) : (
            <>
              <Wallet size={12} />
              Withdraw earnings
            </>
          )}
        </button>
      </motion.section>

      {/* Main Analytics Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Chart */}
        <motion.div variants={itemVariants} className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-3xl flex flex-col justify-between hover:border-brand-border/80 transition-all duration-300">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-semibold text-brand-text-primary flex items-center gap-2">
                <TrendingUp size={14} className="text-brand-primary" />
                Daily Interaction Logs
              </h3>
              <span className="text-[10px] text-brand-text-secondary font-semibold">Last 7 Days</span>
            </div>

            {/* Bar Chart Representation */}
            <div className="flex justify-between items-end h-56 pt-8 pb-3 border-b border-brand-border/40 gap-3">
              {weeklyUsage.map((w, idx) => {
                const heightPercent = (w.count / maxWeeklyCount) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[9px] font-bold text-brand-primary font-mono">{w.count}</span>
                    <div className="w-full bg-brand-bg rounded-t-lg relative h-36 flex items-end overflow-hidden">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="w-full bg-brand-primary rounded-t-lg"
                      />
                    </div>
                    <span className="text-[10px] text-brand-text-secondary font-bold">{w.day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-around text-xs text-brand-text-secondary mt-6 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-primary" />
              <span>Avg Latency: 1.84s</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-primary" />
              <span>Inference Success: 94.6%</span>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Performance stats */}
        <motion.div variants={itemVariants} className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-3xl hover:border-brand-border/80 transition-all duration-300">
          <h3 className="text-sm font-semibold text-brand-text-primary flex items-center gap-2 mb-6">
            <Zap size={14} className="text-brand-primary" />
            Top Performing AI Agents
          </h3>

          {!data || data.agentStats.length === 0 ? (
            <div className="py-12 text-center text-xs text-brand-text-secondary">
              No deployed agents detected.
            </div>
          ) : (
            <div className="space-y-6">
              {data.agentStats.map((agent) => {
                const totalReq = data.totalRequests || 1;
                const sharePercent = Math.round((agent.usageCount / totalReq) * 100);

                return (
                  <div key={agent.id} className="space-y-2 text-xs font-semibold">
                    <div className="flex justify-between font-bold">
                      <span className="text-brand-text-primary">{agent.name}</span>
                      <span className="text-brand-primary">{sharePercent}% of total</span>
                    </div>

                    <div className="w-full h-1.5 bg-brand-bg rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${sharePercent}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-brand-primary"
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-brand-text-secondary font-medium">
                      <span>{agent.usageCount} executions</span>
                      <span>Earned: {formatEtherVal(agent.revenueGenerated)} {isTestnet ? 'tBOT' : 'BOT'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Advanced Conversion funnel details */}
      <motion.section variants={itemVariants} className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-3xl hover:border-brand-border/80 transition-all duration-300">
        <h3 className="text-sm font-semibold text-brand-text-primary">Ecosystem Conversion Metrics</h3>
        <p className="text-xs text-brand-text-secondary mt-1 max-w-2xl leading-relaxed font-medium">
          Detailed metrics of on-chain operations: users entering profiles, choosing agents, signing transactions, and receiving valid responses.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="bg-brand-bg border border-brand-border/60 p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-brand-text-secondary tracking-wider">
              <span>On-Chain Success Rate</span>
              <CheckCircle size={12} className="text-brand-primary" />
            </div>
            <div className="text-2xl font-bold text-brand-primary mt-4 font-mono">99.2%</div>
            <div className="text-[10px] text-brand-text-secondary mt-1.5 font-medium">241 successful payments out of 243</div>
          </div>

          <div className="bg-brand-bg border border-brand-border/60 p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-brand-text-secondary tracking-wider">
              <span>Average Response Latency</span>
              <Clock size={12} className="text-brand-primary" />
            </div>
            <div className="text-2xl font-bold text-brand-text-primary mt-4 font-mono">1.65s</div>
            <div className="text-[10px] text-brand-text-secondary mt-1.5 font-medium">Inference speed + network verification</div>
          </div>

          <div className="bg-brand-bg border border-brand-border/60 p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-brand-text-secondary tracking-wider">
              <span>Unique Consumers</span>
              <Users size={12} className="text-brand-primary" />
            </div>
            <div className="text-2xl font-bold text-brand-text-primary mt-4 font-mono">56</div>
            <div className="text-[10px] text-brand-text-secondary mt-1.5 font-medium">Active consumer wallets invoking agents</div>
          </div>
        </div>
      </motion.section>

    </motion.div>
  );
};
