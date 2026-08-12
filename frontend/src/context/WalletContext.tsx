import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

// BOT Chain configurations
export const NETWORKS = {
  mainnet: {
    chainId: '0x2a5', // 677
    chainName: 'BOT Chain Mainnet',
    nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
    rpcUrls: ['https://rpc.botchain.ai'],
    blockExplorerUrls: ['https://scan.botchain.ai/'],
  },
  testnet: {
    chainId: '0x3c8', // 968
    chainName: 'BOT Chain Testnet',
    nativeCurrency: { name: 'tBOT', symbol: 'tBOT', decimals: 18 },
    rpcUrls: ['https://rpc.bohr.life'],
    blockExplorerUrls: ['https://scan.bohr.life/'],
  }
};

// Default contract address (if deployed - can be overridden in UI or fallback)
// In a production app, this address is deployed on BOT Chain.
export const DEFAULT_CONTRACT_ADDRESSES = {
  mainnet: '0x380cD522A27B84d38E8988483da89660EcD8c141', // Deployed BOTFoundry on Mainnet (chain 677)
  testnet: '0x290EC24ed697A2ADb890F100499b615e83439e78'  // Deployed BOTFoundry on Testnet (chain 968) — push-payment version
};

// Human-readable ABI for our contract
const CONTRACT_ABI = [
  // Core functions
  "function registerAgent(string name, string category, uint256 pricePerRequest, string metadataURI) external returns (uint256)",
  "function updateAgent(uint256 agentId, string name, string category, uint256 pricePerRequest, string metadataURI, bool isActive) external",
  "function payForAgentRequest(uint256 agentId) external payable",
  "function getCreatorAgents(address creator) external view returns (uint256[] memory)",
  "function getAgents(uint256[] calldata ids) external view returns (tuple(uint256 id, address creator, string name, string category, uint256 pricePerRequest, string metadataURI, bool isActive)[] memory)",

  // Pull-payment and governance
  "function withdraw() external",
  "function pendingWithdrawals(address account) external view returns (uint256)",
  "function transferOwnership(address newOwner) external",
  "function acceptOwnership() external",
  "function setTreasury(address payable _treasury) external",
  "function acceptTreasury() external",
  "function pendingOwner() external view returns (address)",
  "function pendingTreasury() external view returns (address)",

  // Events
  "event AgentRegistered(uint256 indexed agentId, address indexed creator, string name, string category, uint256 pricePerRequest, string metadataURI)",
  "event AgentUpdated(uint256 indexed agentId, address indexed creator, string name, string category, uint256 pricePerRequest, string metadataURI, bool isActive)",
  "event AgentPaid(uint256 indexed requestId, uint256 indexed agentId, address indexed user, address creator, uint256 totalAmount, uint256 creatorRevenue, uint256 platformFee)",
  "event PaymentCredited(address indexed account, uint256 amount)",
  "event Withdrawn(address indexed account, uint256 amount)",
  "event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

interface WalletContextType {
  address: string | null;
  balance: string;
  chainId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  networkName: string;
  isTestnet: boolean;
  contractAddress: string;
  setCustomContractAddress: (address: string) => void;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (type: 'mainnet' | 'testnet') => Promise<boolean>;
  registerAgentOnChain: (name: string, category: string, priceWei: string, metadataURI: string) => Promise<{ txHash: string; agentId: number }>;
  updateAgentOnChain: (agentId: number, name: string, category: string, priceWei: string, metadataURI: string, isActive: boolean) => Promise<string>;
  payForAgentOnChain: (agentId: number, priceWei: string) => Promise<string>;
  getPendingWithdrawal: (account?: string) => Promise<string>;
  withdrawEarnings: () => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const getEthereumProvider = () => {
  if (typeof window === 'undefined') return null;
  return window.ethereum || (window as any).bitkeep?.ethereum || null;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [chainId, setChainId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isTestnet, setIsTestnet] = useState<boolean>(false);
  const [contractAddress, setContractAddress] = useState<string>('');

  // Set default contract address depending on the active network
  useEffect(() => {
    const isTest = chainId === '0x3c8' || chainId === '968';
    setIsTestnet(isTest);
    
    // Choose appropriate contract address
    const targetAddress = isTest 
      ? DEFAULT_CONTRACT_ADDRESSES.testnet 
      : DEFAULT_CONTRACT_ADDRESSES.mainnet;
    
    setContractAddress(targetAddress);
  }, [chainId]);

  const setCustomContractAddress = (addr: string) => {
    if (ethers.isAddress(addr)) {
      setContractAddress(addr);
    }
  };

  const getNetworkName = () => {
    if (chainId === '0x2a5' || chainId === '677') return 'BOT Chain Mainnet';
    if (chainId === '0x3c8' || chainId === '968') return 'BOT Chain Testnet';
    return chainId ? `Unsupported (${chainId})` : 'Not Connected';
  };

  const updateAccountDetails = async (provider: ethers.BrowserProvider, account: string) => {
    try {
      setAddress(account);
      const balanceVal = await provider.getBalance(account);
      setBalance(Number(ethers.formatEther(balanceVal)).toFixed(4));
      
      const network = await provider.getNetwork();
      const idHex = '0x' + network.chainId.toString(16);
      setChainId(idHex);
      setIsConnected(true);
    } catch (error) {
      console.error('Error updating account details:', error);
    }
  };

  const switchNetwork = async (type: 'mainnet' | 'testnet'): Promise<boolean> => {
    const ethereum = getEthereumProvider();
    if (!ethereum) {
      console.warn('Switching mock network to:', type);
      setChainId(type === 'testnet' ? '0x3c8' : '0x2a5');
      return true;
    }
    
    const network = NETWORKS[type];
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.chainId }],
      });
      return true;
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask/Wallet.
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [network],
          });
          return true;
        } catch (addError) {
          console.error('Error adding network:', addError);
        }
      }
      console.error('Error switching network:', switchError);
    }
    return false;
  };

  const connectWallet = async () => {
    const ethereum = getEthereumProvider();
    if (!ethereum) {
      console.warn('No EVM wallet detected. Entering mock wallet demo mode.');
      setIsConnecting(true);
      await new Promise(resolve => setTimeout(resolve, 600));
      setAddress('0x71C7656EC7ab88b098defB751B7401B5f6d8976F');
      setBalance('124.5000');
      setChainId('0x2a5');
      setIsConnected(true);
      setIsConnecting(false);
      return;
    }
    
    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(ethereum);
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        await updateAccountDetails(provider, accounts[0]);
        
        // Check current chain ID. If not BOT Chain Mainnet, automatically prompt to switch to Mainnet.
        const network = await provider.getNetwork();
        const chainIdNum = Number(network.chainId);
        if (chainIdNum !== 677) {
          await switchNetwork('mainnet');
        }
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      alert(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setBalance('0');
    setChainId(null);
    setIsConnected(false);
  };

  // Listen for account and chain changes
  useEffect(() => {
    const ethereum = getEthereumProvider();
    if (ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length > 0) {
          const provider = new ethers.BrowserProvider(ethereum);
          await updateAccountDetails(provider, accounts[0]);
        } else {
          disconnectWallet();
        }
      };

      const handleChainChanged = async (chainIdHex: string) => {
        setChainId(chainIdHex);
        if (address) {
          const provider = new ethers.BrowserProvider(ethereum);
          const balanceVal = await provider.getBalance(address);
          setBalance(Number(ethers.formatEther(balanceVal)).toFixed(4));
        }
      };

      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);

      // Auto reconnect
      ethereum.request({ method: 'eth_accounts' }).then(async (accounts: string[]) => {
        if (accounts.length > 0) {
          const provider = new ethers.BrowserProvider(ethereum);
          await updateAccountDetails(provider, accounts[0]);
        }
      }).catch(console.error);

      return () => {
        if (ethereum) {
          if (ethereum.removeListener) {
            ethereum.removeListener('accountsChanged', handleAccountsChanged);
            ethereum.removeListener('chainChanged', handleChainChanged);
          }
        }
      };
    }
  }, [address]);

  // --- SMART CONTRACT OPERATIONS ---

  const getContractInstance = async () => {
    const ethereum = getEthereumProvider();
    if (!ethereum || !address) {
      throw new Error('Wallet not connected');
    }
    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
  };

  const registerAgentOnChain = async (
    name: string,
    category: string,
    priceWei: string,
    metadataURI: string
  ): Promise<{ txHash: string; agentId: number }> => {
    try {
      const contract = await getContractInstance();
      console.log(`Registering Agent: "${name}" Category: "${category}" Price: ${priceWei} wei`);
      
      const tx = await contract.registerAgent(name, category, priceWei, metadataURI);
      const receipt = await tx.wait();
      
      // Parse transaction logs to retrieve the registered Agent ID
      // Event: AgentRegistered(uint256 indexed agentId, address indexed creator, ...)
      let agentId: number | null = null;
      if (receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsedLog = contract.interface.parseLog(log);
            if (parsedLog && parsedLog.name === 'AgentRegistered') {
              agentId = Number(parsedLog.args.agentId);
              break;
            }
          } catch (e) {
            // Log emitted by a different contract/event — skip it
          }
        }
      }

      if (agentId === null) {
        // The on-chain id is what payForAgentRequest requires later. If we can't
        // read it, we must not invent one — that would desync the DB from chain.
        throw new Error('Agent registered on-chain but the AgentRegistered event could not be parsed. Check the contract ABI and address.');
      }

      return { txHash: receipt.hash, agentId };
    } catch (error: any) {
      console.error('Error registering agent on smart contract:', error);
      throw new Error(error.reason || error.message || 'Blockchain transaction failed');
    }
  };

  const updateAgentOnChain = async (
    agentId: number,
    name: string,
    category: string,
    priceWei: string,
    metadataURI: string,
    isActive: boolean
  ): Promise<string> => {
    try {
      const contract = await getContractInstance();
      const tx = await contract.updateAgent(agentId, name, category, priceWei, metadataURI, isActive);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error: any) {
      console.error('Error updating agent on-chain:', error);
      throw new Error(error.reason || error.message || 'Blockchain transaction failed');
    }
  };

  const payForAgentOnChain = async (agentId: number, priceWei: string): Promise<string> => {
    try {
      const contract = await getContractInstance();
      console.log(`Sending payment for agent #${agentId}. Amount: ${priceWei} wei`);

      const tx = await contract.payForAgentRequest(agentId, { value: priceWei });
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error: any) {
      console.error('Error sending payment transaction:', error);
      throw new Error(error.reason || error.message || 'Payment transaction rejected or failed');
    }
  };

  // Read the caller's (or a given account's) claimable balance from the pull-payment ledger.
  // Uses a read-only provider so it works without prompting the wallet.
  const getPendingWithdrawal = async (account?: string): Promise<string> => {
    const ethereum = getEthereumProvider();
    if (!ethereum || !contractAddress) return '0';
    const target = account || address;
    if (!target) return '0';
    try {
      const provider = new ethers.BrowserProvider(ethereum);
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
      const balance = await contract.pendingWithdrawals(target);
      return balance.toString();
    } catch (error) {
      console.error('Error reading pending withdrawal:', error);
      return '0';
    }
  };

  // Claim accumulated earnings (creator revenue, treasury fees, or refunded overpayment).
  const withdrawEarnings = async (): Promise<string> => {
    try {
      const contract = await getContractInstance();
      const tx = await contract.withdraw();
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error: any) {
      console.error('Error withdrawing earnings:', error);
      throw new Error(error.reason || error.message || 'Withdrawal transaction rejected or failed');
    }
  };

  return (
    <WalletContext.Provider value={{
      address,
      balance,
      chainId,
      isConnected,
      isConnecting,
      networkName: getNetworkName(),
      isTestnet,
      contractAddress,
      setCustomContractAddress,
      connectWallet,
      disconnectWallet,
      switchNetwork,
      registerAgentOnChain,
      updateAgentOnChain,
      payForAgentOnChain,
      getPendingWithdrawal,
      withdrawEarnings
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
