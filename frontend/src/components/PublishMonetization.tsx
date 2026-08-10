import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { 
  Send, 
  ArrowLeft, 
  ArrowRight, 
  ShieldCheck, 
  DollarSign, 
  FileText, 
  Lock, 
  Eye,
  CheckCircle,
  HelpCircle,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  { step: 1, title: 'Configure Agent' },
  { step: 2, title: 'Pricing Engine' },
  { step: 3, title: 'Permissions' },
  { step: 4, title: 'Metadata Listing' },
  { step: 5, title: 'Review details' },
  { step: 6, title: 'Publish Agent' }
];

interface PublishMonetizationProps {
  onPublishComplete?: () => void;
  onBack?: () => void;
}

export const PublishMonetization: React.FC<PublishMonetizationProps> = ({ 
  onPublishComplete, 
  onBack 
}) => {
  const { isTestnet } = useWallet();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form states
  const [agentName, setAgentName] = useState('Smart Solidity Auditor');
  const [pricingMode, setPricingMode] = useState<'free' | 'paid'>('paid');
  const [priceRate, setPriceRate] = useState('0.5');
  const [permissionType, setPermissionType] = useState<'public' | 'private' | 'restricted'>('public');
  const [metadataURI, setMetadataURI] = useState('ipfs://QmMockRegistryDetailsMetadataHash');
  const [dailyQueriesSim, setDailyQueriesSim] = useState('50');

  const handleNext = () => {
    if (step < 6) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handlePublish = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(6);
      if (onPublishComplete) onPublishComplete();
    }, 2000);
  };

  const numQueries = parseInt(dailyQueriesSim) || 0;
  const numPrice = pricingMode === 'free' ? 0 : parseFloat(priceRate) || 0;
  const estDailyEarnings = numQueries * numPrice * 0.95;

  const pageVariants = {
    initial: { opacity: 0, x: 6 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -6 }
  } as const;

  return (
    <div className="glass-panel-subtle max-w-2xl mx-auto p-8 sm:p-10 bg-brand-surface border border-brand-border rounded-3xl relative shadow-sm">
      
      {/* Top Header */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-brand-border/40">
        <div>
          <span className="text-[9px] font-bold text-brand-primary uppercase tracking-widest block mb-0.5">Publish Engine</span>
          <h2 className="text-sm font-bold text-brand-text-primary">Ecosystem Monetization Setup</h2>
        </div>
        {onBack && (
          <button onClick={onBack} className="text-xs text-brand-text-secondary hover:text-brand-text-primary flex items-center gap-1">
            <ArrowLeft size={11} /> Cancel
          </button>
        )}
      </div>

      {/* Stepper progress indicator */}
      {step < 6 && (
        <div className="flex justify-between items-center mb-10 overflow-x-auto pb-2 gap-2">
          {STEPS.map(s => (
            <div key={s.step} className="flex items-center gap-1.5 flex-shrink-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-colors ${
                step >= s.step 
                  ? 'bg-brand-text-primary text-brand-bg border-brand-text-primary' 
                  : 'bg-brand-bg text-brand-text-secondary border-brand-border'
              }`}>
                {s.step}
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider hidden sm:inline ${
                step >= s.step ? 'text-brand-text-primary' : 'text-brand-text-secondary'
              }`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Slide transitions container */}
      <AnimatePresence mode="wait">
        
        {/* STEP 1: Configure Agent details */}
        {step === 1 && (
          <motion.div key="s1" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Configure agent identity</h3>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">AI Agent Name</label>
              <input 
                type="text" 
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="w-full bg-brand-bg/50 border border-brand-border px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-brand-primary text-brand-text-primary"
              />
            </div>
          </motion.div>
        )}

        {/* STEP 2: Pricing engine */}
        {step === 2 && (
          <motion.div key="s2" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Set pricing parameters</h3>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setPricingMode('free')}
                className={`flex-1 p-4 rounded-xl border text-left cursor-pointer transition-colors ${
                  pricingMode === 'free' ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-border bg-brand-bg/40'
                }`}
              >
                <span className="font-bold text-xs text-brand-text-primary block">Free Access</span>
                <span className="text-[10px] text-brand-text-secondary mt-1 block">Allow anyone to call the agent without charging BOT tokens.</span>
              </button>
              
              <button 
                onClick={() => setPricingMode('paid')}
                className={`flex-1 p-4 rounded-xl border text-left cursor-pointer transition-colors ${
                  pricingMode === 'paid' ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-border bg-brand-bg/40'
                }`}
              >
                <span className="font-bold text-xs text-brand-text-primary block">Paid usage</span>
                <span className="text-[10px] text-brand-text-secondary mt-1 block">Charge native BOT tokens for every API invocation.</span>
              </button>
            </div>

            {pricingMode === 'paid' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">Cost per Call ({isTestnet ? 'tBOT' : 'BOT'})</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={priceRate}
                    onChange={(e) => setPriceRate(e.target.value)}
                    className="w-full max-w-[200px] bg-brand-bg/50 border border-brand-border px-4 py-2.5 rounded-xl text-base font-bold focus:outline-none focus:border-brand-primary text-brand-text-primary"
                  />
                </div>

                {/* Earnings simulation card */}
                <div className="bg-brand-bg border border-brand-border/60 p-5 rounded-2xl space-y-4 text-xs font-semibold">
                  <div className="flex justify-between items-center text-xs border-b border-brand-border/40 pb-2">
                    <span className="text-brand-text-primary">Ecosystem Earnings Estimator</span>
                    <TrendingUp size={13} className="text-brand-primary" />
                  </div>
                  
                  <div className="flex gap-4 items-center">
                    <div className="flex-1 space-y-1">
                      <label className="block text-[9px] uppercase text-brand-text-secondary">Daily invocations (Simulated)</label>
                      <input 
                        type="number" 
                        value={dailyQueriesSim} 
                        onChange={(e) => setDailyQueriesSim(e.target.value)}
                        className="w-full bg-brand-surface border border-brand-border px-3 py-1.5 rounded-lg text-xs" 
                      />
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] uppercase text-brand-text-secondary block">Est. Daily Earnings (95%)</span>
                      <span className="text-lg font-bold text-brand-primary mt-1 block font-mono">
                        +{estDailyEarnings.toFixed(2)} {isTestnet ? 'tBOT' : 'BOT'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 3: Permissions */}
        {step === 3 && (
          <motion.div key="s3" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Ecosystem Visibility Permissions</h3>

            <div className="space-y-3">
              {[
                { type: 'public', title: 'Public Registry', desc: 'Listed on the public marketplace and discoverable by anyone.' },
                { type: 'restricted', title: 'Restricted Token Gated', desc: 'Only addresses holding specific ERC20 tokens can query.' },
                { type: 'private', title: 'Private Vault', desc: 'Only the creator address can trigger executions.' }
              ].map(p => (
                <button
                  key={p.type}
                  onClick={() => setPermissionType(p.type as any)}
                  className={`w-full p-4 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3.5 ${
                    permissionType === p.type ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-border bg-brand-bg/40'
                  }`}
                >
                  <Lock size={15} className={`mt-0.5 flex-shrink-0 ${permissionType === p.type ? 'text-brand-primary' : 'text-brand-text-secondary'}`} />
                  <div>
                    <span className="font-bold text-xs text-brand-text-primary block">{p.title}</span>
                    <span className="text-[10px] text-brand-text-secondary mt-1 block font-medium leading-relaxed">{p.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* STEP 4: Metadata URI */}
        {step === 4 && (
          <motion.div key="s4" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Configure Marketplace Metadata</h3>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">IPFS Registry URI</label>
              <input 
                type="text" 
                value={metadataURI}
                onChange={(e) => setMetadataURI(e.target.value)}
                className="w-full bg-brand-bg/50 border border-brand-border px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-brand-primary text-brand-text-primary font-mono"
              />
            </div>
            
            <div className="bg-brand-primary/5 border border-brand-primary/10 p-4 rounded-2xl text-xs leading-relaxed text-brand-text-secondary font-medium">
              ℹ️ <strong>IPFS Storage:</strong> This hash maps details (name, avatar, instruction descriptors) on decentralized storage to save gas costs on-chain.
            </div>
          </motion.div>
        )}

        {/* STEP 5: Review */}
        {step === 5 && (
          <motion.div key="s5" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Verify Publication details</h3>

            <div className="bg-brand-bg/60 border border-brand-border p-5 rounded-2xl space-y-4 text-xs font-semibold">
              <div className="flex justify-between">
                <span className="text-brand-text-secondary">Agent Name:</span>
                <span className="text-brand-text-primary">{agentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-text-secondary">Pricing:</span>
                <span className="text-brand-primary font-bold">
                  {pricingMode === 'free' ? 'Free' : `${priceRate} ${isTestnet ? 'tBOT' : 'BOT'} per query`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-text-secondary">Visibility:</span>
                <span className="text-brand-text-primary capitalize">{permissionType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-text-secondary">Metadata Hash:</span>
                <span className="font-mono text-brand-text-primary text-[10px]">{metadataURI.substring(0, 24)}...</span>
              </div>
            </div>

            <button 
              onClick={handlePublish}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 bg-brand-primary hover:bg-brand-primary/95 text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Send size={11} />
              {loading ? 'Submitting registry transaction...' : 'Deploy to Blockchain'}
            </button>
          </motion.div>
        )}

        {/* STEP 6: Success */}
        {step === 6 && (
          <motion.div key="s6" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center text-center gap-6 py-6">
            <div className="w-12 h-12 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
              <CheckCircle size={24} />
            </div>

            <div>
              <h3 className="text-base font-bold text-brand-text-primary">Agent Published successfully!</h3>
              <p className="text-xs text-brand-text-secondary mt-1.5 max-w-sm leading-relaxed font-medium">
                Your AI agent has been initialized in the BOT Chain registry contract and cataloged in the marketplace.
              </p>
            </div>

            {onPublishComplete && (
              <button 
                onClick={onPublishComplete}
                className="bg-brand-text-primary text-brand-bg hover:bg-brand-text-primary/90 px-6 py-2.5 rounded-full text-xs font-bold cursor-pointer transition-all"
              >
                Go to Marketplace
              </button>
            )}
          </motion.div>
        )}

      </AnimatePresence>

      {/* Stepper Navigation bar */}
      {step < 5 && (
        <div className="flex justify-between pt-6 border-t border-brand-border/40 mt-8">
          <button 
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-1 bg-brand-surface hover:bg-brand-elevated text-brand-text-primary border border-brand-border px-4 py-2 rounded-full text-xs font-semibold transition-all disabled:opacity-40 cursor-pointer select-none"
          >
            <ArrowLeft size={12} /> Back
          </button>
          
          <button 
            onClick={handleNext}
            className="flex items-center gap-1 bg-brand-text-primary text-brand-bg hover:bg-brand-text-primary/95 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer select-none shadow-sm"
          >
            Next <ArrowRight size={12} />
          </button>
        </div>
      )}

    </div>
  );
};
