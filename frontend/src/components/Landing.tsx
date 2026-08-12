import React from 'react';
import { useWallet } from '../context/WalletContext';
import { Bot, Cpu, DollarSign, BarChart2, Shield, ArrowRight, Activity, Play, Star, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingProps {
  setCurrentTab: (tab: string) => void;
  theme: 'light' | 'dark';
}

export const Landing: React.FC<LandingProps> = ({ setCurrentTab, theme }) => {
  const { isConnected, connectWallet, isTestnet } = useWallet();

  const handleStart = () => {
    if (isConnected) {
      setCurrentTab('marketplace');
    } else {
      connectWallet().then(() => {
        setCurrentTab('marketplace');
      });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
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
      className="space-y-32 pb-24"
    >
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center pt-6 pb-10 relative">
        <motion.div variants={itemVariants} className="mb-6">
          <span className="inline-flex items-center gap-1.5 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider">
            <Activity size={11} className="animate-pulse" />
            BOT Chain EVM L1 Active
          </span>
        </motion.div>

        <motion.h1 
          variants={itemVariants} 
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight font-display max-w-4xl text-brand-text-primary leading-[1.08] mb-6"
        >
          Build, Deploy & Monetize AI Agents <br/>
          <span className="text-brand-primary">Without Writing Code.</span>
        </motion.h1>

        <motion.p 
          variants={itemVariants} 
          className="text-sm sm:text-base md:text-lg text-brand-text-secondary max-w-2xl leading-relaxed mb-10 font-sans"
        >
          BOTFoundry is the premier no-code AI Agent platform for BOT Chain. Create intelligent agents, publish them to the global marketplace, accept BOT payments, and build an on-chain AI business in minutes.
        </motion.p>

        <motion.div variants={itemVariants} className="flex flex-wrap gap-3.5 justify-center">
          <button 
            onClick={handleStart}
            className="btn-primary select-none cursor-pointer"
          >
            Launch Platform
            <ArrowRight size={14} />
          </button>
          
          <a
            href={isTestnet ? "https://scan.bohr.life" : "https://scan.botchain.ai"}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary select-none cursor-pointer"
          >
            <Play size={13} className="text-brand-primary fill-brand-primary" />
            View Explorer
          </a>
        </motion.div>
      </section>

      {/* Swiss Minimalist Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -4 }}
          className="glass-panel-subtle p-8 bg-brand-surface border border-brand-border rounded-3xl flex flex-col justify-between hover:border-brand-border/60 transition-all duration-300"
        >
          <div>
            <div className="text-3xl font-extrabold text-brand-primary tracking-tight font-mono">
              &lt; 60s
            </div>
            <div className="font-bold text-brand-text-primary mt-4 text-sm">One-Click Registry</div>
            <p className="text-xs text-brand-text-secondary mt-2 leading-relaxed font-medium">
              Define instructions, price rates, and identities instantly. Deploys to BOT Chain in a single transaction.
            </p>
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -4 }}
          className="glass-panel-subtle p-8 bg-brand-surface border border-brand-border rounded-3xl flex flex-col justify-between hover:border-brand-border/60 transition-all duration-300"
        >
          <div>
            <div className="text-3xl font-extrabold text-brand-primary tracking-tight font-mono">
              95%
            </div>
            <div className="font-bold text-brand-text-primary mt-4 text-sm">Creator Split</div>
            <p className="text-xs text-brand-text-secondary mt-2 leading-relaxed font-medium">
              Monetization revenues are split on-chain by public smart contracts. 95% straight to your address.
            </p>
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -4 }}
          className="glass-panel-subtle p-8 bg-brand-surface border border-brand-border rounded-3xl flex flex-col justify-between hover:border-brand-border/60 transition-all duration-300"
        >
          <div>
            <div className="text-3xl font-extrabold text-brand-primary tracking-tight font-mono">
              Instant
            </div>
            <div className="font-bold text-brand-text-primary mt-4 text-sm">On-Chain Settlement</div>
            <p className="text-xs text-brand-text-secondary mt-2 leading-relaxed font-medium">
              Pay-per-request tokens are transferred in real-time. No delayed payouts, no middleman interference.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Core Features / Builder Mockup Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <motion.div variants={itemVariants} className="space-y-8">
          <div>
            <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest block mb-1">Architecture</span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-brand-text-primary leading-snug">
              Engineered for the AI Agent Protocol Economy
            </h2>
            <p className="text-xs text-brand-text-secondary mt-3 max-w-md leading-relaxed font-medium">
              BOTFoundry implements everything you need to transition your intelligent ideas into a profitable blockchain business.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary flex-shrink-0">
                <Cpu size={16} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-brand-text-primary">No-Code AI Builder</h4>
                <p className="text-xs text-brand-text-secondary mt-1 max-w-sm leading-relaxed font-medium">
                  Fill out the identity, prompt instructions, and pricing model. The platform deploys and catalogs your agent automatically.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary flex-shrink-0">
                <DollarSign size={16} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-brand-text-primary">Pay-Per-Request Monetization</h4>
                <p className="text-xs text-brand-text-secondary mt-1 max-w-sm leading-relaxed font-medium">
                  Users pay native BOT/tBOT to interact with your AI. The smart contract validates payments before execution.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary flex-shrink-0">
                <BarChart2 size={16} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-brand-text-primary">Real-time Dashboard Analytics</h4>
                <p className="text-xs text-brand-text-secondary mt-1 max-w-sm leading-relaxed font-medium">
                  Monitor requests count, total revenue generated, usage charts, and recent on-chain transactions inside your developer dashboard.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Visual Mockup Card */}
        <motion.div 
          variants={itemVariants} 
          className="flex flex-col items-center gap-3"
        >
          {/* "Preview" label above the card */}
          <span className="inline-flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-widest text-brand-text-secondary border border-brand-border bg-brand-surface px-3 py-1 rounded-full">
            <span className="w-1 h-1 rounded-full bg-brand-primary animate-pulse" />
            Agent Preview
          </span>

          <div className="glass-panel-subtle p-7 bg-brand-surface border border-brand-border w-full max-w-md shadow-sm relative rounded-3xl hover:border-brand-border/60 transition-all duration-300">
            <div className="flex justify-between items-center mb-6">
              <span className="bg-brand-primary/10 text-brand-primary text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full border border-brand-primary/20">
                Agent Config
              </span>
              <span className="text-[10px] font-bold text-brand-primary flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                Active on BOT Chain
              </span>
            </div>
            
            <div className="flex gap-3.5 items-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-brand-bg border border-brand-border flex items-center justify-center text-xl flex-shrink-0">
                🧠
              </div>
              <div>
                <h4 className="font-bold text-sm text-brand-text-primary">Smart Solidity Auditor</h4>
                <p className="text-[10px] text-brand-text-secondary mt-0.5 font-medium">Category: Coding</p>
              </div>
            </div>
            
            <div className="bg-brand-bg/50 border border-brand-border/60 p-4 rounded-2xl mb-6">
              <div className="text-[9px] uppercase tracking-wider text-brand-text-secondary font-bold">System Instructions</div>
              <div className="text-xs text-brand-text-secondary font-medium italic mt-2 leading-relaxed">
                "You are an expert smart contract security auditor. Review the Solidity code for common vulnerabilities like reentrancy attacks, unchecked math..."
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <span className="text-[9px] text-brand-text-secondary uppercase font-bold tracking-wider">Price per Call</span>
                <div className="text-sm font-bold text-brand-primary mt-0.5">0.2 BOT</div>
              </div>
              <button 
                onClick={handleStart}
                className="btn-primary select-none cursor-pointer"
              >
                Browse Marketplace
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Safety Section */}
      <motion.section 
        variants={itemVariants}
        className="glass-panel-subtle p-8 bg-brand-surface border border-brand-border rounded-3xl flex flex-col items-center text-center gap-3 max-w-3xl mx-auto hover:border-brand-border/60 transition-all duration-300"
      >
        <div className="w-10 h-10 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
          <Shield size={16} />
        </div>
        <h3 className="text-sm font-bold text-brand-text-primary mt-1">Direct Trustless Payouts</h3>
        <p className="text-xs text-brand-text-secondary max-w-xl leading-relaxed font-medium">
          BOTFoundry is a non-custodial protocol. We never hold your private keys. All payment agreements, payouts, and listings are executed in real-time by audited smart contracts on the BOT Chain network.
        </p>
      </motion.section>
    </motion.div>
  );
};
