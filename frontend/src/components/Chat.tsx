import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import { API_BASE } from '../config';
import { Bot, User as UserIcon, Send, CreditCard, ChevronLeft, Loader2, Shield, Copy, Check } from 'lucide-react';
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
}

interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: string | Date;
}

const renderInline = (text: string) => {
  const boldParts = text.split(/(\*\*.*?\*\*)/g);
  return boldParts.map((bPart, bIdx) => {
    if (bPart.startsWith('**') && bPart.endsWith('**')) {
      return <strong key={bIdx} className="font-extrabold text-brand-text-primary">{bPart.slice(2, -2)}</strong>;
    }
    return bPart;
  });
};

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const lang = match ? match[1] : '';
          const code = match ? match[2] : part.slice(3, -3);

          return (
            <div key={index} className="my-3 rounded-xl overflow-hidden border border-brand-border/40 bg-brand-bg/60 relative group/code">
              {lang && (
                <div className="bg-brand-surface border-b border-brand-border/30 px-4 py-1.5 flex justify-between items-center text-[10px] uppercase font-bold text-brand-text-secondary font-mono">
                  <span>{lang}</span>
                </div>
              )}
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="absolute top-2 right-2 p-1.5 rounded bg-brand-surface/80 border border-brand-border/30 text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-elevated opacity-0 group-hover/code:opacity-100 transition-opacity duration-200 cursor-pointer"
                title="Copy code"
                type="button"
              >
                <Copy size={11} />
              </button>
              <pre className="p-4 overflow-x-auto text-[11px] font-mono text-brand-text-primary leading-relaxed bg-brand-bg/90">
                <code>{code}</code>
              </pre>
            </div>
          );
        } else {
          const lines = part.split('\n');
          return (
            <div key={index} className="space-y-2">
              {lines.map((line, lIdx) => {
                if (line.startsWith('##### ')) {
                  return <h5 key={lIdx} className="text-[11px] font-extrabold text-brand-text-primary mt-2 block">{renderInline(line.slice(6))}</h5>;
                }
                if (line.startsWith('#### ')) {
                  return <h4 key={lIdx} className="text-xs font-bold text-brand-text-primary mt-3 block">{renderInline(line.slice(5))}</h4>;
                }
                if (line.startsWith('### ')) {
                  return <h3 key={lIdx} className="text-sm font-extrabold text-brand-text-primary mt-3 block">{renderInline(line.slice(4))}</h3>;
                }
                if (line.startsWith('## ')) {
                  return <h2 key={lIdx} className="text-base font-extrabold text-brand-text-primary mt-4 block">{renderInline(line.slice(3))}</h2>;
                }
                if (line.startsWith('# ')) {
                  return <h1 key={lIdx} className="text-lg font-black text-brand-text-primary mt-5 block">{renderInline(line.slice(2))}</h1>;
                }
                if (line.trim() === '---') {
                  return <hr key={lIdx} className="border-brand-border/30 my-3" />;
                }
                if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                  const cleaned = line.trim().substring(2);
                  return (
                    <li key={lIdx} className="list-disc ml-5 text-xs text-brand-text-primary leading-relaxed font-medium">
                      {renderInline(cleaned)}
                    </li>
                  );
                }
                const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
                if (numMatch) {
                  return (
                    <li key={lIdx} className="list-decimal ml-5 text-xs text-brand-text-primary leading-relaxed font-medium">
                      {renderInline(numMatch[2])}
                    </li>
                  );
                }
                if (line.trim() === '') {
                  return <div key={lIdx} className="h-1" />;
                }
                return (
                  <p key={lIdx} className="text-xs text-brand-text-primary leading-relaxed font-medium">
                    {renderInline(line)}
                  </p>
                );
              })}
            </div>
          );
        }
      })}
    </div>
  );
};

interface ChatProps {
  agent: Agent;
  onBack: () => void;
}

export const Chat: React.FC<ChatProps> = ({ agent, onBack }) => {
  const { address, isTestnet, payForAgentOnChain } = useWallet();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  useEffect(() => {
    const fetchHistory = async () => {
      if (!address) return;
      setHistoryLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/chat/${agent.id}/${address}?network=${isTestnet ? 'testnet' : 'mainnet'}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.messages) {
            setMessages(data.messages);
          }
        }
      } catch (err) {
        console.error('Error fetching chat history:', err);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [agent.id, address, isTestnet]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading || !address) return;

    const promptText = inputText;
    setInputText('');
    setLoading(true);
    setStatusMessage('');

    setMessages(prev => [...prev, { role: 'user', content: promptText, timestamp: new Date() }]);

    let txHash = '';
    const isPaid = agent.pricePerRequest !== '0';

    try {
      if (isPaid) {
        setStatusMessage('Waiting for wallet payment approval...');
        txHash = await payForAgentOnChain(agent.id, agent.pricePerRequest);
        setStatusMessage('Verifying payment on BOT Chain (L1)...');
      } else {
        setStatusMessage('Contacting agent backend...');
      }

      // Contact backend API
      setStatusMessage('Contacting agent backend...');
      const chatRes = await fetch(`${API_BASE}/api/chat/${agent.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: address, message: promptText, txHash, network: isTestnet ? 'testnet' : 'mainnet' })
      });

      if (!chatRes.ok) {
        const errData = await chatRes.json();
        throw new Error(errData.error || 'Agent backend failed to process the request.');
      }

      const data = await chatRes.json();
      const chatHistory: Message[] = data.history;

      setMessages(chatHistory);

    } catch (err: any) {
      console.error(err);
      const errorResponse = `❌ **Error:** ${err.message || 'Failed to communicate with the agent.'}\n\n*If you made a payment, please ensure the transaction confirmed on the explorer and try again.*`;
      setMessages(prev => [...prev, { role: 'model', content: errorResponse, timestamp: new Date() }]);
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const formatPrice = (wei: string) => {
    if (wei === '0') return 'Free';
    return `${ethers.formatEther(wei)} ${isTestnet ? 'tBOT' : 'BOT'}`;
  };

  const formatTime = (time: string | Date) => {
    const date = new Date(time);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-140px)] min-h-[500px]">
      
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-brand-border/40">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2.5 bg-brand-surface hover:bg-brand-elevated text-brand-text-primary border border-brand-border rounded-full select-none cursor-pointer transition-all shadow-sm"
          >
            <ChevronLeft size={14} />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{agent.avatar || '🤖'}</span>
            <div>
              <h3 className="font-bold text-sm text-brand-text-primary leading-tight">{agent.name}</h3>
              <span className="inline-block bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wide mt-1">
                {agent.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Sidebar / Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 flex-grow min-h-0">
        
        {/* Left Sidebar Details */}
        <div className="hidden lg:flex flex-col gap-5 p-6 bg-brand-surface border border-brand-border rounded-3xl overflow-y-auto">
          <div>
            <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest block mb-1">Identity Profile</span>
            <h4 className="text-xs font-bold text-brand-text-primary">Agent Description</h4>
            <p className="text-xs text-brand-text-secondary mt-2.5 leading-relaxed font-medium">{agent.description}</p>
          </div>

          <div className="border-t border-brand-border/50" />

          <div className="space-y-3.5 text-xs font-medium">
            <div className="flex justify-between">
              <span className="text-brand-text-secondary">Price per call:</span>
              <span className="font-bold text-brand-primary">{formatPrice(agent.pricePerRequest)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-text-secondary">Executions:</span>
              <span className="font-bold text-brand-text-primary">{agent.usageCount || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-text-secondary">Creator Profile:</span>
              <span className="font-mono text-brand-text-primary">
                {agent.creator.substring(0, 6)}•••{agent.creator.substring(agent.creator.length - 4)}
              </span>
            </div>
          </div>

          <div className="border-t border-brand-border/50" />

          {agent.pricePerRequest !== '0' && (
            <div className="bg-brand-primary/5 border border-brand-primary/10 p-4 rounded-2xl text-[10px] leading-relaxed text-brand-text-secondary flex gap-2.5 font-medium">
              <Shield size={14} className="text-brand-primary flex-shrink-0 mt-0.5" />
              <span>
                Every prompt sent initiates a secure transaction to the registry contract, splitting revenue between the creator and treasury.
              </span>
            </div>
          )}
        </div>

        {/* Right Chat Panel */}
        <div className="flex flex-col justify-between relative min-h-[350px]">
          {/* Conversation Bubble Panel */}
          <div className="flex-grow overflow-y-auto space-y-5 pr-2 pb-4">
            <AnimatePresence initial={false}>
              {historyLoading ? (
                <div className="flex items-center justify-center h-full gap-2 text-xs text-brand-text-secondary">
                  <Loader2 className="animate-spin text-brand-primary" size={15} />
                  <span>Loading history...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                  <Bot size={32} className="text-brand-text-secondary" />
                  <div>
                    <h4 className="text-xs font-semibold text-brand-text-primary">Conversation Initialized</h4>
                    <p className="text-[11px] text-brand-text-secondary mt-1.5 max-w-xs leading-relaxed font-medium">
                      Send a message to start interacting with {agent.name}. 
                      {agent.pricePerRequest !== '0' && ` Each call requires a secure payment of ${formatPrice(agent.pricePerRequest)}.`}
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={i} 
                    className={`flex flex-col max-w-[85%] sm:max-w-[75%] gap-1.5 ${
                      msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[9px] text-brand-text-secondary uppercase font-bold tracking-wider">
                      {msg.role === 'user' ? (
                        <>
                          <span>You</span>
                          <UserIcon size={10} />
                        </>
                      ) : (
                        <>
                          <Bot size={10} className="text-brand-primary" />
                          <span>{agent.name}</span>
                        </>
                      )}
                    </div>

                    <div className={`relative group px-4.5 py-3 pr-10 rounded-2xl text-xs leading-relaxed font-medium ${
                      msg.role === 'user' 
                        ? 'bg-brand-text-primary text-brand-bg whitespace-pre-wrap' 
                        : 'bg-brand-bg text-brand-text-primary border border-brand-border/60'
                    }`}>
                      {msg.role === 'user' ? msg.content : <MarkdownRenderer content={msg.content} />}
                      <button
                        onClick={() => handleCopyText(msg.content, i)}
                        className={`absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 select-none cursor-pointer ${
                          msg.role === 'user'
                            ? 'text-brand-bg/70 hover:text-brand-bg hover:bg-brand-bg/10'
                            : 'text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-elevated'
                        }`}
                        title="Copy message"
                        type="button"
                      >
                        {copiedIndex === i ? <Check size={12} className={msg.role === 'user' ? "text-brand-bg" : "text-emerald-500"} /> : <Copy size={12} />}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 select-none">
                      <span className="text-[9px] text-brand-text-secondary font-mono">
                        {formatTime(msg.timestamp)}
                      </span>
                      <button
                        onClick={() => handleCopyText(msg.content, i)}
                        className="text-brand-text-secondary hover:text-brand-text-primary p-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer"
                        title="Copy message"
                        type="button"
                      >
                        {copiedIndex === i ? (
                          <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-0.5">
                            <Check size={8} className="text-emerald-500" /> Copied!
                          </span>
                        ) : (
                          <Copy size={9} />
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>

            {/* Thinking / Loading bubble */}
            {loading && (
              <div className="flex flex-col items-start gap-1.5 mr-auto">
                <div className="flex items-center gap-1.5 text-[9px] text-brand-text-secondary uppercase font-bold tracking-wider">
                  <Bot size={10} className="text-brand-primary" />
                  <span>{agent.name}</span>
                </div>
                
                <div className="bg-brand-bg border border-brand-border/60 px-4.5 py-3 rounded-2xl flex items-center gap-2.5 text-xs text-brand-text-secondary font-medium">
                  <Loader2 size={13} className="animate-spin text-brand-primary" />
                  <span>{statusMessage || 'Analyzing variables...'}</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input bar */}
          <form 
            onSubmit={handleSend}
            className="p-4 bg-brand-surface/85 backdrop-blur-md border border-brand-border rounded-3xl flex gap-3 items-end shadow-lg"
          >
            <textarea 
              placeholder={agent.pricePerRequest !== '0' ? `Type query... (requires ${formatPrice(agent.pricePerRequest)})` : 'Type query...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              rows={1}
              className="flex-grow bg-brand-surface border border-brand-border px-4 py-2.5 rounded-2xl text-xs focus:outline-none focus:border-brand-primary placeholder-brand-text-secondary text-brand-text-primary shadow-sm resize-none max-h-32 min-h-[38px] overflow-y-auto leading-relaxed"
              disabled={loading}
            />
            
            <button 
              type="submit" 
              disabled={loading || !inputText.trim()}
              className="flex items-center gap-1.5 bg-brand-text-primary text-brand-bg hover:bg-brand-text-primary/90 px-5 py-2.5 rounded-full text-xs font-bold select-none cursor-pointer transition-all disabled:opacity-50 shadow-sm h-[38px]"
            >
              {agent.pricePerRequest !== '0' ? (
                <>
                  <CreditCard size={12} />
                  Pay & Query
                </>
              ) : (
                <>
                  <Send size={12} />
                  Send
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
