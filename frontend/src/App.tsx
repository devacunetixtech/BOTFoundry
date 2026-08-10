import React, { useState, useEffect } from 'react';
import { WalletProvider } from './context/WalletContext';
import { useWallet } from './context/WalletContext';
import { Navbar } from './components/Navbar';
import { Landing } from './components/Landing';
import { Marketplace } from './components/Marketplace';
import { Builder } from './components/Builder';
import { Dashboard } from './components/Dashboard';
import { CreatorAnalytics } from './components/CreatorAnalytics';
import { Chat } from './components/Chat';
import { CreatorProfile } from './components/CreatorProfile';
import { KnowledgeBaseManager } from './components/KnowledgeBaseManager';
import { AgentDetails } from './components/AgentDetails';


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

const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleRunAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setCurrentTab('chat');
  };

  const handleEditAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setCurrentTab('agent-details');
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text-primary flex flex-col font-sans transition-colors duration-300 overflow-x-hidden w-full max-w-full">
      {/* Top Navbar */}
      <Navbar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {currentTab === 'landing' && (
          <Landing setCurrentTab={setCurrentTab} theme={theme} />
        )}
        
        {currentTab === 'marketplace' && (
          <Marketplace onRunAgent={handleRunAgent} />
        )}
        
        {currentTab === 'builder' && (
          <Builder setCurrentTab={setCurrentTab} />
        )}
        
        {currentTab === 'dashboard' && (
          <Dashboard setCurrentTab={setCurrentTab} onEditAgent={handleEditAgent} />
        )}
        
        {currentTab === 'analytics' && (
          <CreatorAnalytics />
        )}
        
        {currentTab === 'chat' && selectedAgent && (
          <Chat agent={selectedAgent} onBack={() => setCurrentTab('marketplace')} />
        )}

        {currentTab === 'creator-profile' && (
          <CreatorProfile onRunAgent={handleRunAgent} />
        )}

        {currentTab === 'knowledge-manager' && (
          <KnowledgeBaseManager />
        )}

        {currentTab === 'agent-details' && selectedAgent && (
          <AgentDetails agent={selectedAgent} onBack={() => setCurrentTab('dashboard')} onRunAgent={handleRunAgent} />
        )}

      </main>

      {/* Footer */}
      {currentTab !== 'chat' && (
        <footer className="border-t border-brand-border py-12 mt-16 bg-brand-surface/40 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3.5">
              <div className="bg-white/95 border border-brand-border/60 rounded-xl px-2.5 py-1.5 flex items-center justify-center shadow-sm">
                <img 
                  src="/Assets/BFHorizontalLogo.png" 
                  alt="BOTFoundry Logo" 
                  className="h-4.5 w-auto object-contain"
                />
              </div>
              <span className="text-xs text-brand-text-secondary">
                © 2026 BOTFoundry. Built on BOT Chain L1 for the AI Protocol Economy.
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-brand-text-secondary font-mono">
              <span className="px-2.5 py-1 bg-brand-surface border border-brand-border rounded-full">Testnet ID: 968</span>
              <span className="text-brand-border/80">•</span>
              <span className="px-2.5 py-1 bg-brand-surface border border-brand-border rounded-full">Mainnet ID: 677</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}

export default App;

