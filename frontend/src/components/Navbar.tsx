import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { 
  Wallet, 
  Globe, 
  AlertTriangle, 
  LogOut, 
  ChevronDown,
  Bell,
  Sun, 
  Moon, 
  User, 
  Copy, 
  Check,
  Layers,
  Sparkles,
  Command,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RollingNumber } from './RollingNumber';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentTab, 
  setCurrentTab, 
  theme, 
  toggleTheme
}) => {
  const {
    address,
    balance,
    isConnected,
    isConnecting,
    isTestnet,
    chainId,
    connectWallet,
    disconnectWallet,
    switchNetwork
  } = useWallet();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'marketplace', label: 'Marketplace', requiresAuth: false },
    { id: 'sandbox', label: 'Sandbox', requiresAuth: false },
    { id: 'builder', label: 'Build Agent', requiresAuth: true },
    { id: 'dashboard', label: 'Dashboard', requiresAuth: true },
    { id: 'analytics', label: 'Analytics', requiresAuth: true },
  ];

  const goToTab = (tab: string) => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);
  };

  const isWrongNetwork = isConnected && 
    chainId !== '0x2a5' && chainId !== '677' && 
    chainId !== '0x3c8' && chainId !== '968';

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}•••${addr.substring(addr.length - 4)}`;
  };

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="sticky top-6 z-50 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel-subtle flex items-center justify-between px-6 py-3.5 bg-brand-surface/80 backdrop-blur-lg border border-brand-border rounded-full shadow-sm"
      >
        {/* Left Side: Logo */}
        <div className="flex items-center gap-5">
          <div 
            onClick={() => setCurrentTab('landing')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="bg-white/95 border border-brand-border/40 hover:bg-white rounded-xl px-3 py-1 flex items-center justify-center transition-all duration-300 shadow-sm">
              <img 
                src="/Assets/BFHorizontalLogo.png" 
                alt="BOTFoundry Logo" 
                className="h-5 w-auto object-contain"
              />
            </div>
          </div>
        </div>

        {/* Center: Navigation */}
        <div className="hidden lg:flex items-center gap-6">
          <nav className="flex items-center gap-1 bg-brand-bg/40 p-1 rounded-full border border-brand-border/40">
            <button
              onClick={() => setCurrentTab('marketplace')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                currentTab === 'marketplace' 
                  ? 'bg-brand-surface text-brand-text-primary shadow-sm font-semibold' 
                  : 'text-brand-text-secondary hover:text-brand-text-primary'
              }`}
            >
              Marketplace
            </button>
            <button
              onClick={() => setCurrentTab('sandbox')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                currentTab === 'sandbox' 
                  ? 'bg-brand-surface text-brand-text-primary shadow-sm font-semibold' 
                  : 'text-brand-text-secondary hover:text-brand-text-primary'
              }`}
            >
              Sandbox
            </button>
            {isConnected && (
              <>
                <button
                  onClick={() => setCurrentTab('builder')}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    currentTab === 'builder' 
                      ? 'bg-brand-surface text-brand-text-primary shadow-sm font-semibold' 
                      : 'text-brand-text-secondary hover:text-brand-text-primary'
                  }`}
                >
                  Build Agent
                </button>
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    currentTab === 'dashboard' 
                      ? 'bg-brand-surface text-brand-text-primary shadow-sm font-semibold' 
                      : 'text-brand-text-secondary hover:text-brand-text-primary'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentTab('analytics')}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    currentTab === 'analytics' 
                      ? 'bg-brand-surface text-brand-text-primary shadow-sm font-semibold' 
                      : 'text-brand-text-secondary hover:text-brand-text-primary'
                  }`}
                >
                  Analytics
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Right Side: Wallet, Notifications, Profile, Theme switcher */}
        <div className="flex items-center gap-3">

          {/* Network Status / Connection Badge */}
          {!isConnected && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-brand-bg/50 text-brand-text-secondary border border-brand-border rounded-full text-[10px] font-bold uppercase tracking-wider select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-text-secondary/40" />
              Offline
            </div>
          )}

          {/* Theme switcher */}
          <button 
            onClick={toggleTheme}
            className="hidden md:flex p-2 hover:bg-brand-elevated rounded-full text-brand-text-secondary hover:text-brand-text-primary transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          {/* Wrong Network Warning */}
          {isWrongNetwork && (
            <button
              onClick={() => switchNetwork('mainnet')}
              className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
            >
              <AlertTriangle size={12} />
              <span className="hidden sm:inline">Wrong Network</span>
            </button>
          )}

          {/* Premium Wallet Pill */}
          {isConnected ? (
            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 bg-brand-bg hover:bg-brand-elevated border border-brand-border p-1 pr-3 py-1 rounded-full text-xs font-medium text-brand-text-primary select-none cursor-pointer transition-all shadow-sm group"
              >
                {/* Network Tag */}
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider select-none ${
                  isTestnet 
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {isTestnet ? 'TESTNET' : 'MAINNET'}
                </span>
                {/* Truncated Address with copy icon */}
                <span className="font-mono text-xs ml-1 flex items-center gap-1 text-brand-text-primary">
                  {formatAddress(address!)}
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy();
                    }}
                    className="text-brand-text-secondary hover:text-brand-text-primary p-0.5 rounded transition-colors"
                    title="Copy address"
                  >
                    {copied ? <Check size={11} className="text-emerald-400 animate-bounce" /> : <Copy size={11} />}
                  </span>
                </span>
                {/* Divider */}
                <span className="w-[1px] h-3.5 bg-brand-border" />
                {/* Real-time balance ticker with GSAP */}
                <span className="font-mono font-semibold text-brand-text-primary flex items-center gap-1">
                  <RollingNumber value={parseFloat(balance) || 0} decimals={4} />
                  <span className="text-[10px] text-brand-text-secondary">{isTestnet ? 'tBOT' : 'BOT'}</span>
                </span>
                {/* Chevron */}
                <ChevronDown size={11} className="text-brand-text-secondary transition-transform group-hover:translate-y-0.5" />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setDropdownOpen(false)}
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 mt-3.5 w-64 bg-brand-surface border border-brand-border rounded-2xl shadow-xl py-3.5 z-20 overflow-hidden"
                    >
                      {/* Pill style network indicator */}
                      <div className="px-4 py-2 border-b border-brand-border mb-2">
                        <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-brand-text-secondary">
                          <span>Wallet Connected</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${isTestnet ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                            {isTestnet ? 'tBOT' : 'BOT Chain'}
                          </span>
                        </div>
                        <div className="text-lg font-bold text-brand-text-primary mt-1.5 flex items-baseline gap-1">
                          <span>{balance}</span>
                          <span className="text-xs font-semibold text-brand-text-secondary">{isTestnet ? 'tBOT' : 'BOT'}</span>
                        </div>
                      </div>

                      {/* Copy Address */}
                      <button 
                        onClick={handleCopy}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-brand-elevated text-xs text-brand-text-primary transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-brand-text-secondary" />}
                          {copied ? 'Copied address!' : 'Copy Wallet Address'}
                        </span>
                      </button>

                      {/* Network Switcher */}
                      {isTestnet ? (
                        <button 
                          onClick={() => { switchNetwork('mainnet'); setDropdownOpen(false); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-brand-elevated text-xs text-brand-text-primary transition-colors text-left"
                        >
                          <Globe size={12} className="text-emerald-400" />
                          Switch to Mainnet (BOT)
                        </button>
                      ) : (
                        <button 
                          onClick={() => { switchNetwork('testnet'); setDropdownOpen(false); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-brand-elevated text-xs text-brand-text-primary transition-colors text-left"
                        >
                          <Globe size={12} className="text-cyan-400" />
                          Switch to Testnet (tBOT)
                        </button>
                      )}

                      <div className="border-t border-brand-border my-2" />

                      {/* Disconnect */}
                      <button 
                        onClick={() => { disconnectWallet(); setDropdownOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-brand-elevated text-xs text-rose-500 transition-colors text-left"
                      >
                        <LogOut size={12} />
                        Disconnect Wallet
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="btn-primary !px-4 !py-1.5 text-xs select-none cursor-pointer"
            >
              <Wallet size={12} />
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          )}

          {/* User profile dropdown trigger */}
          <div 
            onClick={() => setCurrentTab('creator-profile')}
            className="hidden md:flex w-8 h-8 rounded-full bg-brand-elevated border border-brand-border items-center justify-center text-brand-text-secondary cursor-pointer hover:border-brand-primary transition-colors overflow-hidden"
          >
            <User size={13} />
          </div>

          {/* Mobile hamburger — visible below lg where the nav is hidden */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 hover:bg-brand-elevated rounded-full text-brand-text-secondary hover:text-brand-text-primary transition-colors flex-shrink-0"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </motion.div>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden absolute left-4 right-4 top-full mt-3 z-40 bg-brand-surface border border-brand-border rounded-2xl shadow-xl py-3 overflow-hidden"
            >
              {/* Nav links */}
              <p className="px-4 pt-1 pb-2 text-[9px] font-bold uppercase tracking-widest text-brand-text-secondary">Navigation</p>
              {navItems
                .filter((item) => !item.requiresAuth || isConnected)
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => goToTab(item.id)}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors text-left ${
                      currentTab === item.id
                        ? 'bg-brand-elevated text-brand-text-primary font-semibold'
                        : 'text-brand-text-secondary hover:bg-brand-elevated hover:text-brand-text-primary'
                    }`}
                  >
                    {item.label}
                    {currentTab === item.id && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-primary" />
                    )}
                  </button>
                ))}

              {/* Profile Link (mobile) */}
              {isConnected && (
                <>
                  <p className="px-4 pt-3 pb-2 text-[9px] font-bold uppercase tracking-widest text-brand-text-secondary border-t border-brand-border mt-1">Profile</p>
                  <button
                    onClick={() => goToTab('creator-profile')}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors text-left ${
                      currentTab === 'creator-profile'
                        ? 'bg-brand-elevated text-brand-text-primary font-semibold'
                        : 'text-brand-text-secondary hover:bg-brand-elevated hover:text-brand-text-primary'
                    }`}
                  >
                    <User size={14} className="text-brand-text-secondary" />
                    <span>View Profile</span>
                  </button>
                </>
              )}

              {/* Preferences Switchers (mobile) */}
              <p className="px-4 pt-3 pb-2 text-[9px] font-bold uppercase tracking-widest text-brand-text-secondary border-t border-brand-border mt-1">Preferences</p>
              <button
                onClick={() => { toggleTheme(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-semibold transition-colors text-left text-brand-text-secondary hover:bg-brand-elevated hover:text-brand-text-primary"
              >
                {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
                <span>Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};
