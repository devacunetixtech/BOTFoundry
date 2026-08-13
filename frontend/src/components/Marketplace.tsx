import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { API_BASE } from '../config';
import { Search, Cpu, Play, RefreshCw, Star, ArrowUpRight } from 'lucide-react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  'All',
  'Coding',
  'Research',
  'Writing',
  'Marketing',
  'Customer Support',
  'Education',
  'Finance',
  'Legal',
  'Productivity',
  'General Assistant'
];

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
  featured?: boolean;
}

interface MarketplaceProps {
  onRunAgent: (agent: Agent) => void;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ onRunAgent }) => {
  const { isConnected, connectWallet, isTestnet } = useWallet();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/agents?network=${isTestnet ? 'testnet' : 'mainnet'}`);
      if (!res.ok) throw new Error('Failed to fetch marketplace agents');
      const data = await res.json();
      
      // Inject rating and installs for a premium presentation
      const enrichedData = data.map((agent: any, idx: number) => ({
        ...agent,
        rating: 4.5 + parseFloat((Math.sin(idx) * 0.4).toFixed(1)),
        installs: agent.usageCount || Math.floor(Math.random() * 800) + 120,
        featured: idx % 3 === 0
      }));
      setAgents(enrichedData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not connect to the BOT Chain registry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [isTestnet]);

  const handleRunClick = (agent: Agent) => {
    if (!isConnected) {
      connectWallet().then(() => {
        onRunAgent(agent);
      });
    } else {
      onRunAgent(agent);
    }
  };

  // Filter logic for category selection
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.creator.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = selectedCategory === 'All' || agent.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const formatEtherVal = (wei: string) => {
    try {
      if (wei === '0') return 'Free';
      return `${ethers.formatEther(wei)} ${isTestnet ? 'tBOT' : 'BOT'}`;
    } catch (e) {
      return 'Free';
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}•••${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="space-y-8">
      {/* Header Title Section */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest block mb-1">Registry Catalog</span>
          <h2 className="text-2xl font-bold tracking-tight text-brand-text-primary">AI Agent Marketplace</h2>
          <p className="text-xs text-brand-text-secondary mt-1">Discover, pay, and execute purpose-built AI agents running on BOT Chain.</p>
        </div>
        <button 
          onClick={fetchAgents} 
          className="btn-secondary select-none cursor-pointer text-xs flex items-center gap-2"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh registry
        </button>
      </section>

      {/* Search Input Bar */}
      <div className="relative">
        <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search size={14} className="text-brand-text-secondary" />
        </span>
        <input 
          type="text" 
          placeholder="Search agents by name, category, instructions, or creator address..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field w-full text-xs placeholder-brand-text-secondary !pl-11 !py-3 !rounded-full"
        />
      </div>

      {/* Category Pills (Desktop / Tablet) */}
      <div className="flex flex-wrap gap-1.5 pb-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all select-none cursor-pointer border ${
              selectedCategory === cat
                ? 'bg-brand-primary text-brand-bg border-brand-primary font-bold shadow-sm'
                : 'bg-brand-surface text-brand-text-secondary border-brand-border hover:text-brand-text-primary hover:border-brand-text-secondary/50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 border border-rose-500/20 bg-rose-500/5 p-4 rounded-2xl text-xs text-rose-400">
          <span>⚠ {error}</span>
        </div>
      )}

      {/* Grid of Agents */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-brand-border border-t-brand-primary animate-spin" />
          <p className="text-xs text-brand-text-secondary">Querying BOT Chain contracts...</p>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="glass-panel-subtle p-12 text-center bg-brand-surface border border-brand-border rounded-3xl">
          <Cpu size={32} className="text-brand-text-secondary mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-brand-text-primary">No AI Agents Registered</h3>
          <p className="text-xs text-brand-text-secondary mt-1.5 max-w-sm mx-auto leading-relaxed">
            We couldn't find any agent matching your criteria. Try adjusting your search query or category filters.
          </p>
        </div>
      ) : (
        <motion.div 
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.08
              }
            }
          }}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredAgents.map(agent => (
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 15 },
                  show: { 
                    opacity: 1, 
                    y: 0,
                    transition: { type: "spring", stiffness: 200, damping: 22 }
                  }
                }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                whileHover={{ y: -6 }}
                key={agent.id} 
                className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-3xl flex flex-col justify-between h-full hover:shadow-lg transition-all duration-300 relative group overflow-hidden"
              >
                {/* Agent Header / Badges */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <span className="bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[9px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full">
                        {agent.category.toUpperCase()}
                      </span>
                      {/* Pulse Live Status */}
                      <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE
                      </span>
                    </div>
                    {/* Reward/Earning Badge */}
                    <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider select-none">
                      ★ {agent.pricePerRequest !== '0' ? '90% Payout' : 'Free Agent'}
                    </span>
                  </div>
 
                  {/* Icon + Title Block */}
                  <div className="flex gap-4 items-center mt-5">
                    <div className="w-11 h-11 rounded-2xl bg-brand-bg border border-brand-border flex items-center justify-center text-xl flex-shrink-0">
                      {agent.avatar || '🤖'}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-brand-text-primary group-hover:text-brand-primary transition-colors flex items-center gap-1">
                        <span>{agent.name}</span>
                        <ArrowUpRight size={12} className="text-brand-text-secondary group-hover:text-brand-primary opacity-0 group-hover:opacity-100 transition-all" />
                      </h3>
                      <span className="text-[9px] text-brand-text-secondary block mt-0.5 font-medium">
                        Creator: <span className="font-mono">{formatAddress(agent.creator)}</span>
                      </span>
                    </div>
                  </div>
 
                  {/* Description text */}
                  <p className="text-xs text-brand-text-secondary mt-4 leading-relaxed line-clamp-3 font-medium">
                    {agent.description}
                  </p>
                </div>
 
                {/* Bottom Metadata Bar */}
                <div className="mt-6 space-y-4 pt-4 border-t border-brand-border/50">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-brand-text-secondary font-bold">Cost per Prompt</div>
                      <div className="font-bold text-brand-primary text-sm mt-0.5">
                        {formatEtherVal(agent.pricePerRequest)}
                      </div>
                    </div>
 
                    <div className="text-right">
                      <div className="text-[9px] uppercase tracking-wider text-brand-text-secondary font-bold">Total Calls</div>
                      <div className="font-bold text-brand-text-primary text-xs mt-0.5 font-mono">
                        {agent.usageCount || 0}
                      </div>
                    </div>
                  </div>
 
                  {/* Main Call to Action Button */}
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    onClick={() => handleRunClick(agent)}
                    className="btn-primary w-full text-xs py-2.5 px-4 select-none cursor-pointer"
                  >
                    <Play size={10} className="fill-current" />
                    Interact with Agent
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};
