import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { API_BASE } from '../config';
import { ArrowRight, ArrowLeft, Send, CheckCircle, ShieldAlert, Cpu, Sparkles } from 'lucide-react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
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

const EMOJIS = ['🤖', '🧠', '💻', '✍️', '🪙', '📡', '⚖️', '🎓', '🎨', '🚀', '🔍', '💬'];

interface BuilderProps {
  setCurrentTab: (tab: string) => void;
}

export const Builder: React.FC<BuilderProps> = ({ setCurrentTab }) => {
  const { isConnected, isTestnet, registerAgentOnChain } = useWallet();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [createdAgentId, setCreatedAgentId] = useState<number | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('General Assistant');
  const [avatar, setAvatar] = useState<string>('🤖');
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [price, setPrice] = useState<string>('0.1');

  const handleNext = () => {
    if (step === 1 && (!name.trim() || !description.trim())) {
      alert('Please fill out the agent name and description.');
      return;
    }
    if (step === 2 && !systemPrompt.trim()) {
      alert('Please define the system prompt for the AI agent.');
      return;
    }
    if (step === 3 && (parseFloat(price) < 0 || isNaN(parseFloat(price)))) {
      alert('Price must be a valid number greater than or equal to 0.');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleDeploy = async () => {
    setLoading(true);
    setTxHash(null);
    try {
      const priceWei = ethers.parseEther(price || '0').toString();

      // Build real metadata JSON from form data — no mock hashes
      const metadataJson = {
        name,
        description,
        category,
        avatar,
        systemPrompt,
        pricePerRequest: priceWei,
        createdAt: new Date().toISOString(),
        platform: 'BOTFoundry',
        version: '1.0'
      };
      const metadataURI = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(metadataJson))}`;

      console.log('Sending transaction to register agent on-chain...');
      const result = await registerAgentOnChain(name, category, priceWei, metadataURI);
      const finalTxHash = result.txHash;
      const finalAgentId = result.agentId;
      
      setTxHash(finalTxHash);
      setCreatedAgentId(finalAgentId);

      // Save to backend API
      const backendRes = await fetch(`${API_BASE}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: finalAgentId,
          name,
          description,
          category,
          systemPrompt,
          pricePerRequest: priceWei,
          metadataURI,
          avatar,
          creator: window.ethereum ? (await new ethers.BrowserProvider(window.ethereum).getSigner()).address.toLowerCase() : '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
          network: isTestnet ? 'testnet' : 'mainnet'
        })
      });

      if (!backendRes.ok) {
        console.warn('On-chain registration succeeded, but backend indexing failed.');
      }

      setStep(5);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Transaction rejected or contract interaction failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="glass-panel-subtle p-12 text-center max-w-xl mx-auto my-12 bg-brand-surface border border-brand-border rounded-3xl shadow-sm">
        <Cpu size={36} className="text-brand-primary mx-auto mb-4" />
        <h3 className="text-base font-bold text-brand-text-primary">Connect Wallet to Design Agent</h3>
        <p className="text-xs text-brand-text-secondary mt-2 leading-relaxed max-w-sm mx-auto">
          You need to connect an EVM-compatible wallet (MetaMask, TokenPocket, Bitget) to create and deploy AI Agent contracts on the BOT Chain.
        </p>
      </div>
    );
  }

  const numPrice = parseFloat(price) || 0;
  const platformFee = numPrice * 0.05;
  const creatorShare = numPrice * 0.95;

  const pageVariants = {
    initial: { opacity: 0, x: 8 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -8 }
  } as const;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold tracking-tight text-brand-text-primary">Agent Builder</h2>
        <p className="text-xs text-brand-text-secondary mt-1.5 font-medium">Design and deploy your custom AI agent identities directly on BOT Chain</p>
      </div>

      <div className="glass-panel-subtle max-w-2xl mx-auto p-8 sm:p-10 bg-brand-surface border border-brand-border rounded-3xl relative shadow-sm">
      
      {/* Step Indicators */}
      {step < 5 && (
        <div className="flex items-center justify-between mb-12 relative">
          {[1, 2, 3, 4].map((num) => (
            <div key={num} className="flex flex-col items-center flex-1 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                step >= num 
                  ? 'bg-brand-text-primary text-brand-bg border-brand-text-primary' 
                  : 'bg-brand-surface text-brand-text-secondary border-brand-border'
              }`}>
                {num}
              </div>
              <span className={`text-[9px] uppercase tracking-wider mt-2.5 font-bold hidden sm:inline ${
                step >= num ? 'text-brand-text-primary' : 'text-brand-text-secondary'
              }`}>
                {num === 1 && 'Information'}
                {num === 2 && 'Secret Instructions'}
                {num === 3 && 'Monetization'}
                {num === 4 && 'Deploy'}
              </span>
            </div>
          ))}
          <div className="absolute top-4 left-[12%] right-[12%] h-[1px] bg-brand-border z-0" />
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <motion.div 
            key="step1"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6"
          >
            <div>
              <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest block mb-1">Configuration</span>
              <h3 className="text-lg font-bold text-brand-text-primary">Step 1: Agent Profile Details</h3>
              <p className="text-xs text-brand-text-secondary mt-1">Give your agent an identity, purpose, and profile details for the marketplace.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">Agent Name</label>
              <input 
                type="text" 
                placeholder="e.g. Smart Solidity Auditor" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="w-full bg-brand-bg/50 border border-brand-border px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-brand-primary text-brand-text-primary placeholder-brand-text-secondary"
                maxLength={40}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">Short Description</label>
                <span className="text-[9px] text-brand-text-secondary">{description.length}/200 chars</span>
              </div>
              <textarea 
                placeholder="Describe what this AI agent does, its specialties, and how it helps users..." 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className="w-full bg-brand-bg/50 border border-brand-border px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-brand-primary text-brand-text-primary placeholder-brand-text-secondary min-h-[90px] resize-none"
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">Category</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  className="w-full bg-brand-bg border border-brand-border px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-brand-primary text-brand-text-primary"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">Avatar Icon</label>
                <div className="flex gap-2">
                  <div className="w-10 h-10 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-center text-xl flex-shrink-0">
                    {avatar}
                  </div>
                  <select 
                    value={avatar} 
                    onChange={(e) => setAvatar(e.target.value)} 
                    className="w-full bg-brand-bg border border-brand-border px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-brand-primary text-brand-text-primary"
                  >
                    {EMOJIS.map(emo => (
                      <option key={emo} value={emo}>{emo}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-brand-border/60">
              <button 
                onClick={handleNext} 
                className="flex items-center gap-1.5 bg-brand-text-primary text-brand-bg hover:bg-brand-text-primary/90 px-5 py-2.5 rounded-full text-xs font-bold select-none cursor-pointer transition-all shadow-sm"
              >
                Next Step
                <ArrowRight size={13} />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: Instructions */}
        {step === 2 && (
          <motion.div 
            key="step2"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6"
          >
            <div>
              <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest block mb-1">Knowledge Core</span>
              <h3 className="text-lg font-bold text-brand-text-primary">Step 2: AI System Prompt</h3>
              <p className="text-xs text-brand-text-secondary mt-1">These are the secret instructions that define your agent's expertise, tone of voice, limits, and rules.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">System Instructions (System Prompt)</label>
              <textarea 
                placeholder="e.g. You are a senior smart contract auditor. Your task is to analyze Solidity contract code provided by the user. Look for common security flaws like Reentrancy, Integer Overflow/Underflow, and incorrect access control. Always respond in markdown with clear headings, explanation of the bugs, and the corrected Solidity code snippets." 
                value={systemPrompt} 
                onChange={(e) => setSystemPrompt(e.target.value)} 
                className="w-full bg-brand-bg/50 border border-brand-border px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-brand-primary text-brand-text-primary placeholder-brand-text-secondary min-h-[180px]"
              />
            </div>

            <div className="bg-brand-primary/5 border border-brand-primary/10 p-4 rounded-2xl text-xs leading-relaxed text-brand-text-secondary">
              💡 <strong>Pro Tip:</strong> Writing a highly detailed instruction makes your agent perform better. Set clear constraints (e.g. "Do not answer questions outside smart contracts").
            </div>

            <div className="flex justify-between pt-4 border-t border-brand-border/60">
              <button 
                onClick={handleBack} 
                className="flex items-center gap-1.5 bg-brand-surface hover:bg-brand-elevated text-brand-text-primary border border-brand-border px-4.5 py-2.5 rounded-full text-xs font-semibold select-none cursor-pointer transition-all"
              >
                <ArrowLeft size={13} />
                Back
              </button>
              <button 
                onClick={handleNext} 
                className="flex items-center gap-1.5 bg-brand-text-primary text-brand-bg hover:bg-brand-text-primary/90 px-5 py-2.5 rounded-full text-xs font-bold select-none cursor-pointer transition-all shadow-sm"
              >
                Next Step
                <ArrowRight size={13} />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Pricing */}
        {step === 3 && (
          <motion.div 
            key="step3"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6"
          >
            <div>
              <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest block mb-1">Economics</span>
              <h3 className="text-lg font-bold text-brand-text-primary">Step 3: Pay-Per-Request Pricing</h3>
              <p className="text-xs text-brand-text-secondary mt-1">Configure how much users will pay in BOT tokens every time they send a query to this AI agent.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">Price per Request ({isTestnet ? 'tBOT' : 'BOT'})</label>
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  className="bg-brand-bg/50 border border-brand-border px-4 py-2.5 rounded-xl text-base font-bold focus:outline-none focus:border-brand-primary text-brand-text-primary w-full max-w-[200px]"
                />
                <span className="font-bold text-sm text-brand-text-primary">{isTestnet ? 'tBOT' : 'BOT'}</span>
              </div>
            </div>

            {/* Fee breakdown card */}
            <div className="bg-brand-bg/50 border border-brand-border p-5 rounded-2xl space-y-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-brand-text-secondary">Total cost to user:</span>
                <span className="font-bold text-brand-text-primary">{numPrice.toFixed(4)} {isTestnet ? 'tBOT' : 'BOT'}</span>
              </div>
              
              <div className="flex justify-between text-brand-text-secondary">
                <span>Platform fee (5%):</span>
                <span>- {platformFee.toFixed(4)} {isTestnet ? 'tBOT' : 'BOT'}</span>
              </div>
              
              <div className="border-t border-brand-border" />

              <div className="flex justify-between font-bold text-sm">
                <span className="text-brand-text-primary">Your earnings (95%):</span>
                <span className="text-brand-primary">+ {creatorShare.toFixed(4)} {isTestnet ? 'tBOT' : 'BOT'}</span>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-brand-border/60">
              <button 
                onClick={handleBack} 
                className="flex items-center gap-1.5 bg-brand-surface hover:bg-brand-elevated text-brand-text-primary border border-brand-border px-4.5 py-2.5 rounded-full text-xs font-semibold select-none cursor-pointer transition-all"
              >
                <ArrowLeft size={13} />
                Back
              </button>
              <button 
                onClick={handleNext} 
                className="flex items-center gap-1.5 bg-brand-text-primary text-brand-bg hover:bg-brand-text-primary/90 px-5 py-2.5 rounded-full text-xs font-bold select-none cursor-pointer transition-all shadow-sm"
              >
                Next Step
                <ArrowRight size={13} />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: Review and Deploy */}
        {step === 4 && (
          <motion.div 
            key="step4"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6"
          >
            <div>
              <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest block mb-1">Confirmation</span>
              <h3 className="text-lg font-bold text-brand-text-primary">Step 4: Deploy to BOT Chain</h3>
              <p className="text-xs text-brand-text-secondary mt-1">Review all configuration details. This operation requires an EVM blockchain transaction to register identity on the BOT Chain registry contract.</p>
            </div>

            <div className="bg-brand-bg/50 border border-brand-border p-6 rounded-2xl space-y-4 text-xs">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-2xl bg-brand-surface border border-brand-border flex items-center justify-center text-xl flex-shrink-0">
                  {avatar}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-brand-text-primary">{name}</h4>
                  <p className="text-brand-text-secondary mt-0.5 font-medium">Category: {category}</p>
                </div>
              </div>

              <div>
                <div className="text-[9px] uppercase font-bold text-brand-text-secondary tracking-wider">Description</div>
                <p className="text-brand-text-primary mt-1.5 leading-relaxed font-medium">{description}</p>
              </div>

              <div>
                <div className="text-[9px] uppercase font-bold text-brand-text-secondary tracking-wider">Pricing Model</div>
                <div className="text-brand-primary font-bold text-sm mt-1">
                  {parseFloat(price) === 0 ? 'Free' : `${price} ${isTestnet ? 'tBOT' : 'BOT'} per Request`}
                </div>
              </div>

              <div>
                <div className="text-[9px] uppercase font-bold text-brand-text-secondary tracking-wider">Network Target</div>
                <span className="inline-block bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-3 py-0.5 rounded-full text-[9px] mt-1.5 uppercase font-bold tracking-wide">
                  {isTestnet ? 'BOT Chain Testnet (968)' : 'BOT Chain Mainnet (677)'}
                </span>
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl text-xs leading-relaxed text-brand-text-secondary flex gap-3 items-start font-medium">
              <ShieldAlert size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                Once deployed, name, category, and pricing parameters can be modified via your creator dashboard. You must pay small gas fees to execute the registration on-chain.
              </span>
            </div>

            <div className="flex justify-between pt-4 border-t border-brand-border/60">
              <button 
                onClick={handleBack} 
                disabled={loading} 
                className="flex items-center gap-1.5 bg-brand-surface hover:bg-brand-elevated text-brand-text-primary border border-brand-border px-4.5 py-2.5 rounded-full text-xs font-semibold select-none cursor-pointer transition-all"
              >
                <ArrowLeft size={13} />
                Back
              </button>
              <button 
                onClick={handleDeploy} 
                disabled={loading}
                className="flex items-center gap-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white px-6 py-2.5 rounded-full text-xs font-bold select-none cursor-pointer transition-all shadow-sm"
              >
                <Send size={12} />
                {loading ? 'Confirming Tx...' : 'Deploy & Publish'}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 5: Success Screen */}
        {step === 5 && (
          <motion.div 
            key="step5"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col items-center text-center gap-6 py-6"
          >
            <div className="w-14 h-14 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
              <CheckCircle size={28} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-brand-text-primary">AI Agent Successfully Deployed!</h2>
              <p className="text-xs text-brand-text-secondary mt-1.5 max-w-sm leading-relaxed font-medium">
                Your agent has been registered on BOT Chain and published to the public marketplace.
              </p>
            </div>

            <div className="bg-brand-bg/50 border border-brand-border p-5 rounded-2xl w-full max-w-md text-xs space-y-2.5 text-left font-medium">
              <div className="flex justify-between">
                <span className="text-brand-text-secondary">Registered Agent ID:</span>
                <span className="font-bold text-brand-text-primary">#{createdAgentId}</span>
              </div>
              
              {txHash && (
                <div className="flex justify-between">
                  <span className="text-brand-text-secondary">Transaction Hash:</span>
                  <a 
                    href={isTestnet ? `https://scan.bohr.life/tx/${txHash}` : `https://scan.botchain.ai/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-brand-primary hover:underline"
                  >
                    {txHash.substring(0, 10)}•••{txHash.substring(txHash.length - 8)}
                  </a>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setCurrentTab('marketplace')} 
                className="bg-brand-text-primary text-brand-bg hover:bg-brand-text-primary/90 px-6 py-2.5 rounded-full text-xs font-bold select-none cursor-pointer transition-all shadow-sm"
              >
                View in Marketplace
              </button>
              <button 
                onClick={() => {
                  setName('');
                  setDescription('');
                  setSystemPrompt('');
                  setPrice('0.1');
                  setStep(1);
                }}
                className="bg-brand-surface hover:bg-brand-elevated text-brand-text-primary border border-brand-border px-6 py-2.5 rounded-full text-xs font-bold select-none cursor-pointer transition-all"
              >
                Build Another
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};
