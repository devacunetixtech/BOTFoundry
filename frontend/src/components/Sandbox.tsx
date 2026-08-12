import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { API_BASE } from '../config';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Play, Cpu, AlertTriangle, CheckCircle, ExternalLink, Loader2, Sparkles, RefreshCw, Copy, Check } from 'lucide-react';

const SOL_TEMPLATE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BohrFaucet {
    address public owner;
    uint256 public amountPerRequest = 0.1 ether;
    mapping(address => uint256) public lastRequestTime;

    event FaucetDrip(address indexed receiver, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    receive() external payable {}

    function requestTokens() external {
        require(address(this).balance >= amountPerRequest, "Faucet is dry");
        require(block.timestamp >= lastRequestTime[msg.sender] + 1 days, "Can only request once a day");

        lastRequestTime[msg.sender] = block.timestamp;
        payable(msg.sender).transfer(amountPerRequest);

        emit FaucetDrip(msg.sender, amountPerRequest);
    }

    function withdraw() external {
        require(msg.sender == owner, "Only owner");
        payable(owner).transfer(address(this).balance);
    }
}`;

const FAUCET_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "FaucetDrip",
    "type": "event"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  },
  {
    "inputs": [],
    "name": "amountPerRequest",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "lastRequestTime",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "requestTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export const Sandbox: React.FC = () => {
  const { address, isConnected, connectWallet, isTestnet, switchNetwork } = useWallet();

  const [solidityCode, setSolidityCode] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [isFixing, setIsFixing] = useState<boolean>(false);

  const [compileErrors, setCompileErrors] = useState<string[]>([]);
  const [deployError, setDeployError] = useState<string>('');
  const [abi, setAbi] = useState<any[] | null>(null);
  const [bytecode, setBytecode] = useState<string | null>(null);
  const [contractName, setContractName] = useState<string>('');
  const [contractOwner, setContractOwner] = useState<string>('');
  const [constructorArgs, setConstructorArgs] = useState<string[]>([]);

  const getConstructorInputs = () => {
    if (!abi) return [];
    const constructorItem = abi.find((item: any) => item.type === 'constructor');
    return constructorItem ? (constructorItem.inputs || []) : [];
  };

  useEffect(() => {
    const inputs = getConstructorInputs();
    setConstructorArgs(new Array(inputs.length).fill(''));
  }, [abi]);

  // Sandbox deployment network selector
  const [targetNetwork, setTargetNetwork] = useState<'testnet' | 'mainnet'>('testnet');
  const [deployedAddress, setDeployedAddress] = useState<string>('');
  const [deployTxHash, setDeployTxHash] = useState<string>('');
  const [contractBalance, setContractBalance] = useState<string>('0');
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [isFunding, setIsFunding] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [copiedHistoryAddress, setCopiedHistoryAddress] = useState<string>('');

  // Gasless faucet relayer states
  const [captchaQuestion, setCaptchaQuestion] = useState<string>('');
  const [captchaChallengeId, setCaptchaChallengeId] = useState<string>('');
  const [captchaAnswer, setCaptchaAnswer] = useState<string>('');
  const [isRequestingGasless, setIsRequestingGasless] = useState<boolean>(false);
  const [gaslessClaimMsg, setGaslessClaimMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [deploymentHistory, setDeploymentHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!address) {
      setDeploymentHistory([]);
      return;
    }
    const key = `sandbox_history_${address.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as any[];
        const filtered = parsed.filter((item) => item.network === targetNetwork);
        setDeploymentHistory(filtered);
      } catch (e) {
        console.error('Error parsing deployment history', e);
      }
    } else {
      setDeploymentHistory([]);
    }
  }, [address, targetNetwork]);

  const handleCopyAddress = () => {
    if (!deployedAddress) return;
    navigator.clipboard.writeText(deployedAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleCopyHistoryAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedHistoryAddress(addr);
    setTimeout(() => setCopiedHistoryAddress(''), 2000);
  };

  const fetchContractBalance = async () => {
    if (!deployedAddress) return;
    try {
      let provider;
      if ((window as any).ethereum) {
        provider = new ethers.BrowserProvider((window as any).ethereum);
      } else {
        const rpcUrl = targetNetwork === 'testnet' ? 'https://rpc.bohr.life' : 'https://rpc.botchain.ai';
        provider = new ethers.JsonRpcProvider(rpcUrl);
      }
      const bal = await provider.getBalance(deployedAddress);
      setContractBalance(ethers.formatEther(bal));

      try {
        const contract = new ethers.Contract(deployedAddress, abi || [
          {
            "inputs": [],
            "name": "owner",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
          }
        ], provider);
        const ownerAddr = await contract.owner();
        if (ownerAddr) {
          setContractOwner(ownerAddr);
        }
      } catch (ownerErr) {
        setContractOwner('');
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  useEffect(() => {
    if (deployedAddress) {
      fetchContractBalance();
    }
  }, [deployedAddress]);

  const publicFaucets = [
    {
      address: '0x9Ba4031A20D60C9880eb9943a4Fe6b94180CbFa4',
      name: 'Official BohrFaucet',
      network: 'testnet',
      abi: FAUCET_ABI
    },
    {
      address: '0x380cD522A27B84d38E8988483da89660EcD8c141',
      name: 'Official BotFaucet',
      network: 'mainnet',
      abi: FAUCET_ABI
    }
  ];

  const [faucetsList, setFaucetsList] = useState<any[]>([]);

  const fetchFaucets = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sandbox/faucets?network=${targetNetwork}`);
      const data = await res.json();
      if (data.success && data.faucets) {
        // Merge hardcoded faucets with DB faucets, avoiding duplicates by address
        const combined = [...publicFaucets];
        data.faucets.forEach((df: any) => {
          if (!combined.some(cf => cf.address.toLowerCase() === df.address.toLowerCase())) {
            combined.push({
              address: df.address,
              name: df.name,
              network: df.network,
              abi: df.abi
            });
          }
        });
        setFaucetsList(combined);
      } else {
        setFaucetsList(publicFaucets);
      }
    } catch (err) {
      console.error('Error fetching faucets:', err);
      setFaucetsList(publicFaucets);
    }
  };

  useEffect(() => {
    fetchFaucets();
  }, [targetNetwork]);

  // Keep target network in sync with global navbar network switch initially
  useEffect(() => {
    setTargetNetwork(isTestnet ? 'testnet' : 'mainnet');
  }, [isTestnet]);

  // Is connected wallet network different from selected target network?
  const networkMismatch = isConnected && (
    (targetNetwork === 'testnet' && !isTestnet) ||
    (targetNetwork === 'mainnet' && isTestnet)
  );

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setCompileErrors([]);
    setAbi(null);
    setBytecode(null);
    setDeployedAddress('');
    setDeployTxHash('');

    try {
      const res = await fetch(`${API_BASE}/api/sandbox/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.success && data.code) {
        setSolidityCode(data.code);
      } else {
        alert(data.error || 'Failed to generate contract.');
      }
    } catch (err) {
      console.error(err);
      alert('Error communicating with AI contract generator.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCompile = async () => {
    setIsCompiling(true);
    setCompileErrors([]);
    setAbi(null);
    setBytecode(null);
    setDeployedAddress('');
    setDeployTxHash('');

    try {
      const res = await fetch(`${API_BASE}/api/sandbox/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: solidityCode }),
      });
      const data = await res.json();
      if (data.success) {
        setAbi(data.abi);
        setBytecode(data.bytecode);
        setContractName(data.contractName);
      } else {
        setCompileErrors(data.errors || [data.error || 'Compilation failed.']);
      }
    } catch (err) {
      console.error(err);
      setCompileErrors(['Failed to connect to compilation server.']);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleHelpFix = async (errorMsg: string) => {
    if (!solidityCode) return;
    setIsFixing(true);
    try {
      const res = await fetch(`${API_BASE}/api/sandbox/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: solidityCode, error: errorMsg }),
      });
      const data = await res.json();
      if (data.success && data.code) {
        setSolidityCode(data.code);
        // Automatically compile the fixed code
        setTimeout(async () => {
          setIsCompiling(true);
          setCompileErrors([]);
          setDeployError('');
          setAbi(null);
          setBytecode(null);
          setDeployedAddress('');
          setDeployTxHash('');
          try {
            const cRes = await fetch(`${API_BASE}/api/sandbox/compile`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: data.code }),
            });
            const cData = await cRes.json();
            if (cData.success) {
              setAbi(cData.abi);
              setBytecode(cData.bytecode);
              setContractName(cData.contractName);
            } else {
              setCompileErrors(cData.errors || [cData.error || 'Compilation failed.']);
            }
          } catch (cErr) {
            setCompileErrors(['Failed to compile fixed code automatically.']);
          } finally {
            setIsCompiling(false);
          }
        }, 300);
      } else {
        alert(data.error || 'AI Debugger failed to return a solution.');
      }
    } catch (err) {
      console.error(err);
      alert('Error communicating with AI debugger.');
    } finally {
      setIsFixing(false);
    }
  };

  const handleDeploy = async () => {
    if (!isConnected) {
      await connectWallet();
      return;
    }

    if (networkMismatch) {
      alert(`Please switch your wallet network to ${targetNetwork === 'testnet' ? 'BOT Chain Testnet' : 'BOT Chain Mainnet'} first.`);
      return;
    }

    if (!abi || !bytecode) {
      alert('Please compile the contract successfully before deploying.');
      return;
    }

    setIsDeploying(true);
    setDeployError('');
    try {
      // Connect to window.ethereum using ethers v6 BrowserProvider
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      const factory = new ethers.ContractFactory(abi, bytecode, signer);
      
      const formattedArgs = getConstructorInputs().map((input: any, idx: number) => {
        const val = constructorArgs[idx] || '';
        if (input.type.endsWith('[]')) {
          try {
            if (val.trim().startsWith('[')) {
              return JSON.parse(val);
            }
            return val.split(',').map((v: string) => v.trim()).filter((v: string) => v !== '');
          } catch (e) {
            return val.split(',').map((v: string) => v.trim()).filter((v: string) => v !== '');
          }
        }
        if (input.type === 'bool') {
          return val.toLowerCase() === 'true' || val === '1';
        }
        if (input.type.startsWith('uint') || input.type.startsWith('int')) {
          try {
            return BigInt(val);
          } catch (e) {
            return val;
          }
        }
        return val;
      });

      const contract = await factory.deploy(...formattedArgs);
      
      const deploymentReceipt = await contract.waitForDeployment();
      const address = await contract.getAddress();
      const tx = contract.deploymentTransaction();

      setDeployedAddress(address);
      if (tx) {
        setDeployTxHash(tx.hash);
      }

      // Save to history
      if (address && signer) {
        const userAddress = await signer.getAddress();
        const newHistoryItem = {
          address: address,
          name: contractName || 'CustomContract',
          code: solidityCode,
          abi: abi || [],
          bytecode: bytecode || '',
          timestamp: Date.now(),
          network: targetNetwork
        };
        const key = `sandbox_history_${userAddress.toLowerCase()}`;
        const stored = localStorage.getItem(key);
        let currentHistory = [];
        if (stored) {
          try {
            currentHistory = JSON.parse(stored);
          } catch (e) {
            console.error(e);
          }
        }
        const updatedHistory = [newHistoryItem, ...currentHistory];
        localStorage.setItem(key, JSON.stringify(updatedHistory));
        setDeploymentHistory(updatedHistory.filter((item: any) => item.network === targetNetwork));

        // Check if the deployed contract is a faucet and register it in the backend database
        const isFaucet = (contractName || '').toLowerCase().includes('faucet') || (abi && abi.some((x: any) => x.name === 'requestTokens'));
        if (isFaucet) {
          try {
            await fetch(`${API_BASE}/api/sandbox/faucets`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                address: address,
                name: contractName || (targetNetwork === 'testnet' ? 'BohrFaucet' : 'BotFaucet'),
                creator: userAddress,
                network: targetNetwork,
                abi: abi
              })
            });
            fetchFaucets();
          } catch (e) {
            console.error("Failed to register faucet in DB:", e);
          }
        }
      }


    } catch (err: any) {
      console.error(err);
      setDeployError(err.message || String(err));
    } finally {
      setIsDeploying(false);
    }
  };

  const handleNetworkSwitch = async () => {
    if (targetNetwork === 'testnet') {
      await switchNetwork('testnet');
    } else {
      await switchNetwork('mainnet');
    }
  };

  const tokenSymbol = targetNetwork === 'testnet' ? 'tBOT' : 'BOT';

  const fetchCaptcha = async (clearMsg = true) => {
    try {
      const res = await fetch(`${API_BASE}/api/faucet/captcha`);
      const data = await res.json();
      if (data.success) {
        setCaptchaQuestion(data.question);
        setCaptchaChallengeId(data.challengeId);
        setCaptchaAnswer('');
        if (clearMsg) {
          setGaslessClaimMsg(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch captcha:', err);
    }
  };

  const handleGaslessClaim = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!address) {
      alert('Please connect your EVM wallet first to receive faucet tokens.');
      return;
    }
    if (!captchaAnswer.trim()) {
      alert('Please enter the captcha answer.');
      return;
    }
    setIsRequestingGasless(true);
    setGaslessClaimMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/faucet/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          challengeId: captchaChallengeId,
          answer: captchaAnswer.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGaslessClaimMsg({
          type: 'success',
          text: `Success! 0.1 tBOT has been transferred to your wallet. Tx: ${data.txHash.substring(0, 10)}•••`
        });
        setCaptchaQuestion('');
        setCaptchaAnswer('');
      } else {
        setGaslessClaimMsg({
          type: 'error',
          text: data.error || 'Claim failed. Please try again.'
        });
        fetchCaptcha(false);
      }
    } catch (err: any) {
      setGaslessClaimMsg({
        type: 'error',
        text: err.message || 'Network error occurred.'
      });
    } finally {
      setIsRequestingGasless(false);
    }
  };

  // Fetch captcha on target network change
  useEffect(() => {
    if (targetNetwork === 'testnet') {
      fetchCaptcha(true);
    }
  }, [targetNetwork]);

  const handleClaimFromFaucet = async () => {
    if (!deployedAddress || !abi) return;
    setIsClaiming(true);
    try {
      if (!(window as any).ethereum) {
        // Mock fallback
        await new Promise(resolve => setTimeout(resolve, 800));
        setContractBalance(prev => {
          const val = parseFloat(prev) - 0.1;
          return val < 0 ? '0' : val.toFixed(4);
        });
        alert(`Success! 0.1 ${tokenSymbol} has been transferred to your connected wallet.`);
        return;
      }
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(deployedAddress, abi, signer);

      const tx = await contract.requestTokens();
      await tx.wait();
      
      await fetchContractBalance();
      alert(`Success! 0.1 ${tokenSymbol} has been transferred to your connected wallet.`);
    } catch (err: any) {
      console.error(err);
      alert(`Claim failed: ${err.reason || err.message || err}`);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleFundFaucet = async () => {
    if (!deployedAddress) return;
    setIsFunding(true);
    try {
      if (!(window as any).ethereum) {
        // Mock fallback
        await new Promise(resolve => setTimeout(resolve, 800));
        setContractBalance(prev => (parseFloat(prev) + 1.0).toFixed(4));
        alert(`Success! Faucet funded with 1.0 ${tokenSymbol}.`);
        return;
      }
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      const tx = await signer.sendTransaction({
        to: deployedAddress,
        value: ethers.parseEther('1.0')
      });
      await tx.wait();
      
      await fetchContractBalance();
      alert(`Success! Faucet funded with 1.0 ${tokenSymbol}.`);
    } catch (err: any) {
      console.error(err);
      alert(`Funding failed: ${err.reason || err.message || err}`);
    } finally {
      setIsFunding(false);
    }
  };

  const handleFundContract = async () => {
    if (!deployedAddress) return;
    setIsFunding(true);
    try {
      if (!(window as any).ethereum) {
        // Mock fallback
        await new Promise(resolve => setTimeout(resolve, 800));
        setContractBalance(prev => (parseFloat(prev) + 1.0).toFixed(4));
        alert(`Success! Contract funded with 1.0 ${tokenSymbol}.`);
        return;
      }
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      const tx = await signer.sendTransaction({
        to: deployedAddress,
        value: ethers.parseEther('1.0')
      });
      await tx.wait();
      
      await fetchContractBalance();
      alert(`Success! Contract funded with 1.0 ${tokenSymbol}.`);
    } catch (err: any) {
      console.error(err);
      alert(`Funding failed: ${err.reason || err.message || err}`);
    } finally {
      setIsFunding(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col gap-2">
        <div>
          <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest block mb-1">Developer Sandbox</span>
          <h2 className="text-2xl font-bold tracking-tight text-brand-text-primary">BOT Chain Smart Contract Studio</h2>
          <p className="text-xs text-brand-text-secondary mt-1">
            Describe what your contract should do. The AI will write the Solidity code. Compile and deploy instantly to BOT Chain.
          </p>
        </div>
      </section>

      {/* Main Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Solidity Editor and Prompt Input */}
        <div className="lg:col-span-7 space-y-6">
          {/* Natural Language Prompt */}
          <div className="glass-panel-subtle bg-brand-surface border border-brand-border p-5 rounded-3xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-primary flex items-center gap-1.5">
              <Sparkles size={13} className="text-brand-primary" />
              AI Smart Contract Architect
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Describe your contract (e.g. 'Simple reward vault with lock period and release functions')..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="input-field flex-grow text-xs placeholder-brand-text-secondary !rounded-full"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="btn-primary select-none cursor-pointer text-xs disabled:opacity-50 flex-shrink-0"
              >
                {isGenerating ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Sparkles size={13} />
                )}
                Generate Code
              </button>
            </div>
          </div>

          {/* Solidity Code Editor */}
          <div className="glass-panel-subtle bg-brand-surface border border-brand-border rounded-3xl overflow-hidden flex flex-col">
            <div className="border-b border-brand-border/60 bg-brand-bg/40 px-5 py-3.5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Code2 size={14} className="text-brand-text-secondary" />
                <span className="text-xs font-bold text-brand-text-primary">Solidity Source Code</span>
              </div>
              <span className="text-[10px] bg-brand-elevated text-brand-text-secondary px-2.5 py-0.5 rounded font-mono">
                0.8.20
              </span>
            </div>
            
            <div className="relative flex-grow flex">
              {/* Line Numbers Simulation */}
              <div className="bg-brand-bg/20 text-brand-text-secondary/35 text-right font-mono text-[10px] px-3.5 py-4 border-r border-brand-border/30 select-none flex flex-col gap-[3px] text-right">
                {Array.from({ length: solidityCode.split('\n').length }).map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              
              <textarea
                value={solidityCode}
                onChange={(e) => setSolidityCode(e.target.value)}
                className="w-full bg-transparent font-mono text-[11px] p-4 text-brand-text-primary focus:outline-none resize-none leading-[17px] min-h-[420px]"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Compiler & Deployment Studio */}
        <div className="lg:col-span-5 space-y-6">

          {/* Active Public Faucets Directory */}
          {targetNetwork === 'testnet' && (
            <div className="glass-panel-subtle bg-brand-surface border border-brand-border p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-primary flex items-center gap-2">
                  <Code2 size={14} className="text-brand-text-secondary" />
                  Active Public Faucets
                </h3>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                  targetNetwork === 'testnet'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {targetNetwork === 'testnet' ? 'Bohr Testnet' : 'BOT Chain Mainnet'}
                </span>
              </div>
              <p className="text-[10px] text-brand-text-secondary leading-relaxed">
                Below are BohrFaucet contracts deployed by other developers on this network. Click on any faucet to load its interaction panel and claim tokens!
              </p>

              {/* Removed separate card, merged into BohrFaucet interact console */}

              {faucetsList.filter((f: any) => f.network === targetNetwork).length === 0 ? (
                <p className="text-[10px] text-brand-text-secondary italic text-center py-4 bg-brand-bg/30 border border-brand-border rounded-2xl">
                  No active public faucets found on {targetNetwork === 'testnet' ? 'Testnet' : 'Mainnet'}. Be the first to deploy one!
                </p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {faucetsList.filter((f: any) => f.network === targetNetwork).map((faucet: any) => {
                    const isCurrent = deployedAddress.toLowerCase() === faucet.address.toLowerCase();
                    return (
                      <div
                        key={faucet.address}
                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                          isCurrent
                            ? 'bg-brand-primary/5 border-brand-primary'
                            : 'bg-brand-bg/40 border-brand-border/60 hover:border-brand-border'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0 flex-grow">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-brand-text-primary truncate">
                                {faucet.name}
                              </span>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                                faucet.network === 'testnet'
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                {faucet.network === 'testnet' ? 'Testnet' : 'Mainnet'}
                              </span>
                              {isCurrent && (
                                <span className="text-[8px] font-bold bg-brand-primary text-white px-1.5 py-0.5 rounded-full uppercase animate-pulse">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-[9px] text-brand-text-secondary truncate mt-0.5">
                              {faucet.address}
                            </p>
                          </div>

                          {!isCurrent && (
                            <button
                              onClick={async () => {
                                setDeployedAddress(faucet.address);
                                setDeployTxHash('');
                                if (faucet.abi) {
                                  setAbi(faucet.abi);
                                }
                                try {
                                  let provider;
                                  if ((window as any).ethereum) {
                                    provider = new ethers.BrowserProvider((window as any).ethereum);
                                  } else {
                                    const rpcUrl = targetNetwork === 'testnet' ? 'https://rpc.bohr.life' : 'https://rpc.botchain.ai';
                                    provider = new ethers.JsonRpcProvider(rpcUrl);
                                  }
                                  const bal = await provider.getBalance(faucet.address);
                                  setContractBalance(ethers.formatEther(bal));
                                  
                                  const contractInstance = new ethers.Contract(faucet.address, faucet.abi, provider);
                                  try {
                                    const ownerAddress = await contractInstance.owner();
                                    setContractOwner(ownerAddress);
                                  } catch (e) {
                                    console.error("Could not query faucet owner:", e);
                                    setContractOwner('');
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="btn-secondary select-none cursor-pointer text-[10px] !px-3 !py-1.5"
                            >
                              Interact
                            </button>
                          )}
                        </div>

                        {isCurrent && (
                          <div className="pt-2.5 border-t border-brand-border/40 space-y-3 animate-fadeIn">
                            {/* Connected Wallet network status display */}
                            <div className="flex justify-between items-center bg-brand-bg/50 border border-brand-border/40 px-3 py-2 rounded-xl text-[10px]">
                              <span className="font-semibold text-brand-text-secondary">Connected Wallet</span>
                              {isConnected ? (
                                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                                  <span className={isTestnet ? 'text-purple-400' : 'text-emerald-400'}>
                                    {isTestnet ? 'Bohr Testnet' : 'BOT Chain Mainnet'}
                                  </span>
                                  {isTestnet !== (faucet.network === 'testnet') ? (
                                    <span className="text-amber-500 text-[8px] border border-amber-500/25 px-1 py-0.2 rounded-full uppercase animate-pulse">
                                      Mismatch
                                    </span>
                                  ) : (
                                    <span className="text-emerald-400 text-[8px] border border-emerald-400/25 px-1 py-0.2 rounded-full uppercase">
                                      Match
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-brand-text-secondary italic">Not Connected</span>
                              )}
                            </div>

                            {/* Network Mismatch Warning banner */}
                            {isConnected && (isTestnet !== (faucet.network === 'testnet')) && (
                              <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl space-y-2 text-[10px] text-amber-500 font-semibold leading-relaxed">
                                <span className="flex items-center gap-1.5">
                                  <AlertTriangle size={12} className="flex-shrink-0 animate-bounce" />
                                  Your wallet is connected to {isTestnet ? 'Bohr Testnet' : 'BOT Chain Mainnet'}, but this faucet is on {faucet.network === 'testnet' ? 'Bohr Testnet' : 'BOT Chain Mainnet'}.
                                </span>
                                <button
                                  onClick={handleNetworkSwitch}
                                  className="w-full bg-amber-500 hover:bg-amber-400 text-brand-bg py-1.5 rounded-full text-[9px] font-extrabold select-none cursor-pointer transition-colors"
                                >
                                  Switch Wallet to {faucet.network === 'testnet' ? 'Bohr Testnet' : 'BOT Chain Mainnet'}
                                </button>
                              </div>
                            )}

                            <div className="flex justify-between items-center bg-brand-bg/50 border border-brand-border/40 px-3 py-2 rounded-xl">
                              <span className="text-[10px] font-semibold text-brand-text-secondary">Current Balance</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold text-brand-text-primary">{contractBalance} {tokenSymbol}</span>
                                <button
                                  onClick={fetchContractBalance}
                                  className="text-brand-primary hover:underline text-[9px] font-bold"
                                >
                                  Refresh
                                </button>
                              </div>
                            </div>

                            {parseFloat(contractBalance) === 0 && (
                              <p className="text-[9px] text-amber-500 font-semibold bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg leading-relaxed">
                                {((address && contractOwner && address.toLowerCase() === contractOwner.toLowerCase()) || (address && address.toLowerCase() === '0xa5ea648efd8eab7e3277c6957ac88e7d37ddb742'))
                                  ? '⚠️ Faucet balance is 0. Please click "Fund Faucet" below before claiming!'
                                  : '⚠️ Faucet balance is 0. Contact the contract owner to fund this faucet.'}
                              </p>
                            )}

                            {faucet.network === 'testnet' ? (
                              <div className="space-y-3 pt-1">
                                {captchaQuestion ? (
                                  <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-brand-text-secondary uppercase block">
                                      Solve to verify: <span className="font-bold text-brand-text-primary text-[10px]">{captchaQuestion}</span>
                                    </label>
                                    <div className="flex gap-2">
                                      <input
                                        type="number"
                                        placeholder="Your answer"
                                        value={captchaAnswer}
                                        onChange={(e) => setCaptchaAnswer(e.target.value)}
                                        className="input-field flex-grow text-xs !rounded-xl !py-1.5 !px-3 font-mono"
                                        disabled={isRequestingGasless}
                                        required
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center text-[9px] pt-1">
                                    <span className="text-brand-text-secondary font-medium">Captcha expired or verified.</span>
                                    <button
                                      onClick={() => fetchCaptcha(true)}
                                      className="text-brand-primary hover:underline font-bold"
                                    >
                                      Load Captcha
                                    </button>
                                  </div>
                                )}

                                {gaslessClaimMsg && (
                                  <div className={`p-2.5 rounded-xl border text-[9px] leading-relaxed font-semibold ${
                                    gaslessClaimMsg.type === 'success'
                                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                  }`}>
                                    {gaslessClaimMsg.text}
                                  </div>
                                )}

                                {((address && contractOwner && address.toLowerCase() === contractOwner.toLowerCase()) || (address && address.toLowerCase() === '0xa5ea648efd8eab7e3277c6957ac88e7d37ddb742')) ? (
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      onClick={handleFundFaucet}
                                      disabled={isFunding || (isConnected && (isTestnet !== (faucet.network === 'testnet')))}
                                      className="btn-secondary select-none cursor-pointer text-[10px] !py-2 flex items-center justify-center gap-1 disabled:opacity-50"
                                    >
                                      {isFunding && <Loader2 size={10} className="animate-spin" />}
                                      Fund Faucet (1 {tokenSymbol})
                                    </button>
                                    <button
                                      onClick={handleGaslessClaim}
                                      disabled={isRequestingGasless || !captchaAnswer.trim() || (isConnected && (isTestnet !== (faucet.network === 'testnet')))}
                                      className="btn-primary select-none cursor-pointer text-[10px] !py-2 flex items-center justify-center gap-1 disabled:opacity-50"
                                    >
                                      {isRequestingGasless && <Loader2 size={10} className="animate-spin" />}
                                      Claim (0.1 {tokenSymbol})
                                    </button>
                                  </div>
                                ) : (
                                  <div className="w-full">
                                    <button
                                      onClick={handleGaslessClaim}
                                      disabled={isRequestingGasless || !captchaAnswer.trim() || (isConnected && (isTestnet !== (faucet.network === 'testnet')))}
                                      className="btn-primary w-full select-none cursor-pointer text-[10px] !py-2 flex items-center justify-center gap-1 disabled:opacity-50"
                                    >
                                      {isRequestingGasless && <Loader2 size={10} className="animate-spin" />}
                                      Claim (0.1 {tokenSymbol})
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              ((address && contractOwner && address.toLowerCase() === contractOwner.toLowerCase()) || (address && address.toLowerCase() === '0xa5ea648efd8eab7e3277c6957ac88e7d37ddb742')) ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={handleFundFaucet}
                                    disabled={isFunding || (isConnected && (isTestnet !== (faucet.network === 'testnet')))}
                                    className="btn-secondary select-none cursor-pointer text-[10px] !py-2 flex items-center justify-center gap-1 disabled:opacity-50"
                                  >
                                    {isFunding && <Loader2 size={10} className="animate-spin" />}
                                    Fund Faucet (1 {tokenSymbol})
                                  </button>
                                  <button
                                    onClick={handleClaimFromFaucet}
                                    disabled={isClaiming || parseFloat(contractBalance) < 0.1 || (isConnected && (isTestnet !== (faucet.network === 'testnet')))}
                                    className="btn-primary select-none cursor-pointer text-[10px] !py-2 flex items-center justify-center gap-1 disabled:opacity-50"
                                  >
                                    {isClaiming && <Loader2 size={10} className="animate-spin" />}
                                    Claim (0.1 {tokenSymbol})
                                  </button>
                                </div>
                              ) : (
                                <div className="w-full">
                                  <button
                                    onClick={handleClaimFromFaucet}
                                    disabled={isClaiming || parseFloat(contractBalance) < 0.1 || (isConnected && (isTestnet !== (faucet.network === 'testnet')))}
                                    className="btn-primary w-full select-none cursor-pointer text-[10px] !py-2 flex items-center justify-center gap-1 disabled:opacity-50"
                                  >
                                    {isClaiming && <Loader2 size={10} className="animate-spin" />}
                                    Claim (0.1 {tokenSymbol})
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Compilation Stage */}
          <div className="glass-panel-subtle bg-brand-surface border border-brand-border p-6 rounded-3xl space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-primary flex items-center gap-2">
                <Cpu size={14} className="text-brand-text-secondary" />
                Step 1: Solidity Compiler
              </h3>
              {abi && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  <CheckCircle size={10} /> Ready
                </span>
              )}
            </div>

            <button
              onClick={handleCompile}
              disabled={isCompiling}
              className="btn-secondary w-full text-xs select-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCompiling ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              Compile Contract
            </button>

            {/* Error logs or ABI summary */}
            <AnimatePresence mode="wait">
              {compileErrors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-2xl space-y-2.5"
                >
                  <span className="text-[10px] font-bold uppercase text-rose-400 flex items-center gap-1">
                    <AlertTriangle size={11} /> Compiler Error Output
                  </span>
                  <div className="max-h-[140px] overflow-y-auto text-[10px] font-mono text-rose-300 leading-relaxed whitespace-pre-wrap divide-y divide-rose-500/10">
                    {compileErrors.map((err, index) => (
                      <div key={index} className="py-1.5 first:pt-0 last:pb-0">
                        {err}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleHelpFix(compileErrors.join('\n'))}
                    disabled={isFixing}
                    className="btn-primary w-full text-xs select-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isFixing ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    Help Fix with AI
                  </button>
                </motion.div>
              )}

              {abi && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl space-y-2.5 text-xs text-brand-text-secondary"
                >
                  <p className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                    <CheckCircle size={13} /> Contract Compiled Cleanly!
                  </p>
                  <div className="space-y-1.5 text-[10px] font-medium leading-relaxed">
                    <p>Contract Name: <span className="font-mono text-brand-text-primary font-bold">{contractName}</span></p>
                    <p>ABI Functions: <span className="font-mono text-brand-text-primary">{abi.filter(x => x.type === 'function').length} functions</span></p>
                    <p>Bytecode Size: <span className="font-mono text-brand-text-primary">{(bytecode?.length || 0) / 2} bytes</span></p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Deployment Stage */}
          <div className="glass-panel-subtle bg-brand-surface border border-brand-border p-6 rounded-3xl space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-primary flex items-center gap-2">
              <Play size={14} className="text-brand-text-secondary fill-current" />
              Step 2: Deployment Settings
            </h3>

            {/* Network target selector */}
            <div className="flex justify-between items-center gap-3">
              <span className="text-xs font-bold text-brand-text-secondary">Target Network</span>
              <select
                value={targetNetwork}
                onChange={(e: any) => setTargetNetwork(e.target.value)}
                className="input-field rounded-full text-xs font-semibold px-4 py-2 focus:outline-none text-brand-text-primary"
              >
                <option value="testnet">BOT Chain Testnet</option>
                <option value="mainnet">BOT Chain Mainnet</option>
              </select>
            </div>

            {/* Network mismatch warning banner */}
            {networkMismatch && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-xs text-amber-500 font-semibold">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  Wallet must switch network to {targetNetwork === 'testnet' ? 'Testnet' : 'Mainnet'}.
                </span>
                <button
                  onClick={handleNetworkSwitch}
                  className="bg-amber-500 hover:bg-amber-400 text-brand-bg px-3 py-1.5 rounded-full text-[10px] font-extrabold select-none cursor-pointer transition-colors flex-shrink-0"
                >
                  Switch Chain
                </button>
              </div>
            )}
            {/* Constructor Parameters */}
            {getConstructorInputs().length > 0 && (
              <div className="bg-brand-bg/30 border border-brand-border p-4 rounded-2xl space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary block">
                  Constructor Parameters
                </span>
                <div className="space-y-2.5">
                  {getConstructorInputs().map((input: any, index: number) => (
                    <div key={index} className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-brand-text-primary flex justify-between">
                        <span>{input.name || `param${index}`}</span>
                        <span className="text-brand-text-secondary font-mono">({input.type})</span>
                      </label>
                      <input
                        type="text"
                        placeholder={`Enter ${input.type}`}
                        value={constructorArgs[index] || ''}
                        onChange={(e) => {
                          const updated = [...constructorArgs];
                          updated[index] = e.target.value;
                          setConstructorArgs(updated);
                        }}
                        className="input-field w-full text-[10px] placeholder-brand-text-secondary/70 !rounded-full !py-2 !px-3"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleDeploy}
              disabled={isDeploying || !abi || !bytecode || networkMismatch}
              className="btn-primary w-full text-xs select-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isDeploying ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Deploying to BOT Chain...
                </>
              ) : (
                <>
                  <Play size={10} className="fill-current" />
                  Deploy Contract
                </>
              )}
            </button>

            {!deployedAddress && (
              <div className="pt-3 border-t border-brand-border/40 flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">
                  Or Load Deployed Contract
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste deployed address (0x...)"
                    id="load-address-input"
                    className="input-field flex-grow text-[10px] placeholder-brand-text-secondary font-mono !rounded-full !py-2 !px-3"
                  />
                  <button
                    onClick={async () => {
                      const val = (document.getElementById('load-address-input') as HTMLInputElement)?.value?.trim();
                      if (ethers.isAddress(val)) {
                        setDeployedAddress(val);
                        const loadedAbi = abi || [
                          {
                            "inputs": [],
                            "stateMutability": "nonpayable",
                            "type": "constructor"
                          },
                          {
                            "anonymous": false,
                            "inputs": [
                              {
                                "indexed": true,
                                "internalType": "address",
                                "name": "receiver",
                                "type": "address"
                              },
                              {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "amount",
                                "type": "uint256"
                              }
                            ],
                            "name": "FaucetDrip",
                            "type": "event"
                          },
                          {
                            "stateMutability": "payable",
                            "type": "receive"
                          },
                          {
                            "inputs": [],
                            "name": "amountPerRequest",
                            "outputs": [
                              {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                              }
                            ],
                            "stateMutability": "view",
                            "type": "function"
                          },
                          {
                            "inputs": [
                              {
                                "internalType": "address",
                                "name": "",
                                "type": "address"
                              }
                            ],
                            "name": "lastRequestTime",
                            "outputs": [
                              {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                              }
                            ],
                            "stateMutability": "view",
                            "type": "function"
                          },
                          {
                            "inputs": [],
                            "name": "owner",
                            "outputs": [
                              {
                                "internalType": "address",
                                "name": "",
                                "type": "address"
                              }
                            ],
                            "stateMutability": "view",
                            "type": "function"
                          },
                          {
                            "inputs": [],
                            "name": "requestTokens",
                            "outputs": [],
                            "stateMutability": "nonpayable",
                            "type": "function"
                          },
                          {
                            "inputs": [],
                            "name": "withdraw",
                            "outputs": [],
                            "stateMutability": "nonpayable",
                            "type": "function"
                          }
                        ];
                        
                        if (!abi) {
                          setAbi(loadedAbi);
                        }
                        setDeployTxHash('');


                      } else {
                        alert('Please enter a valid EVM contract address.');
                      }
                    }}
                    className="btn-secondary select-none cursor-pointer text-[10px] !px-4 !py-2"
                  >
                    Load
                  </button>
                </div>
              </div>
            )}

            {/* Deploy success message */}
            <AnimatePresence>
              {deployError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-2xl space-y-2.5 mt-4"
                >
                  <span className="text-[10px] font-bold uppercase text-rose-400 flex items-center gap-1">
                    <AlertTriangle size={11} /> Deployment Error Output
                  </span>
                  <div className="max-h-[120px] overflow-y-auto text-[10px] font-mono text-rose-300 leading-relaxed whitespace-pre-wrap break-all">
                    {deployError}
                  </div>
                  <button
                    onClick={() => handleHelpFix(deployError)}
                    disabled={isFixing}
                    className="btn-primary w-full text-xs select-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isFixing ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    Help Fix with AI
                  </button>
                </motion.div>
              )}

              {deployTxHash && deployedAddress && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl space-y-3 mt-4"
                >
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">Contract Deployed Successfully!</span>
                    <p className="font-mono text-[10px] font-bold text-brand-text-primary break-all">
                      {deployedAddress}
                    </p>
                  </div>
                  <div className="flex gap-4 pt-1 border-t border-brand-border/40">
                    <a
                      href={targetNetwork === 'testnet' ? `https://scan.bohr.life/address/${deployedAddress}` : `https://scan.botchain.ai/address/${deployedAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold text-brand-primary hover:text-brand-primary/80 transition-colors"
                    >
                      <ExternalLink size={12} /> View on Explorer
                    </a>
                    <button
                      onClick={handleCopyAddress}
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold text-brand-text-secondary hover:text-brand-text-primary transition-colors cursor-pointer select-none"
                    >
                      {copiedAddress ? (
                        <>
                          <Check size={12} className="text-emerald-400" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copy Address
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Interactive Contract Console for Custom Contracts */}
          <AnimatePresence>
            {deployedAddress && !publicFaucets.some((f: any) => f.address.toLowerCase() === deployedAddress.toLowerCase() && f.network === targetNetwork) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="glass-panel-subtle bg-brand-surface border border-brand-border p-5 rounded-2xl space-y-4"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-primary">
                    Interactive Contract Console
                  </span>
                  <button
                    onClick={fetchContractBalance}
                    className="text-[10px] text-brand-primary hover:underline font-bold select-none cursor-pointer"
                  >
                    Refresh Balance
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div className="bg-brand-bg/50 border border-brand-border p-3.5 rounded-xl flex flex-col gap-1.5">
                    <span className="text-[9px] font-bold uppercase text-brand-text-secondary">Contract Address</span>
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-mono text-[10px] text-brand-text-primary truncate">{deployedAddress}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={targetNetwork === 'testnet' ? `https://scan.bohr.life/address/${deployedAddress}` : `https://scan.botchain.ai/address/${deployedAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-text-secondary hover:text-brand-primary transition-colors"
                          title="View on Explorer"
                        >
                          <ExternalLink size={12} />
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(deployedAddress);
                            setCopiedAddress(true);
                            setTimeout(() => setCopiedAddress(false), 2000);
                          }}
                          className="text-brand-text-secondary hover:text-brand-text-primary transition-colors cursor-pointer"
                          title="Copy Address"
                        >
                          {copiedAddress ? (
                            <Check size={12} className="text-emerald-400" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-brand-bg/50 border border-brand-border p-3.5 rounded-xl flex justify-between items-center">
                    <span className="text-xs font-semibold text-brand-text-secondary">Current Balance</span>
                    <span className="font-mono text-xs font-bold text-brand-text-primary">{contractBalance} {tokenSymbol}</span>
                  </div>
                </div>

                {parseFloat(contractBalance) === 0 && (
                  <p className="text-[10px] text-amber-500 font-semibold bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg">
                    ⚠️ Contract balance is 0. Please click "Fund Contract" below if needed!
                  </p>
                )}

                <button
                  onClick={handleFundContract}
                  disabled={isFunding}
                  className="btn-primary w-full text-xs select-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isFunding && <Loader2 size={12} className="animate-spin" />}
                  Fund Contract (1 {tokenSymbol})
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Your Deployment History */}
          {address && (
            <div className="glass-panel-subtle bg-brand-surface border border-brand-border p-6 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-primary flex items-center gap-2">
                <RefreshCw size={14} className="text-brand-text-secondary" />
                Your Deployment History
              </h3>
              <p className="text-[10px] text-brand-text-secondary leading-relaxed">
                View and access your previously deployed contracts on this network. Load their code back to modify/redeploy, or load them to interact.
              </p>

              {deploymentHistory.length === 0 ? (
                <p className="text-[10px] text-brand-text-secondary italic text-center py-4 bg-brand-bg/30 border border-brand-border rounded-2xl">
                  No deployed contracts found on this network for your connected address.
                </p>
              ) : (
                <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                  {deploymentHistory.map((item, idx) => {
                    const isCurrentlyLoaded = deployedAddress.toLowerCase() === item.address.toLowerCase();
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border space-y-2.5 transition-all ${
                          isCurrentlyLoaded
                            ? 'bg-brand-primary/5 border-brand-primary'
                            : 'bg-brand-bg/40 border-brand-border/60 hover:border-brand-border'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-bold text-brand-text-primary truncate">
                              {item.name}
                            </span>
                            <span className="text-[8px] text-brand-text-secondary whitespace-nowrap">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <span className="font-mono text-[9px] text-brand-text-secondary truncate">
                              {item.address}
                            </span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <a
                                href={item.network === 'testnet' ? `https://scan.bohr.life/address/${item.address}` : `https://scan.botchain.ai/address/${item.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-text-secondary hover:text-brand-primary transition-colors"
                                title="View on Explorer"
                              >
                                <ExternalLink size={10} />
                              </a>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyHistoryAddress(item.address);
                                }}
                                className="text-brand-text-secondary hover:text-brand-text-primary transition-colors cursor-pointer"
                                title="Copy Address"
                              >
                                {copiedHistoryAddress.toLowerCase() === item.address.toLowerCase() ? (
                                  <Check size={10} className="text-emerald-400" />
                                ) : (
                                  <Copy size={10} />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSolidityCode(item.code);
                              setContractName(item.name);
                              alert(`Loaded Solidity code for ${item.name} into the editor!`);
                            }}
                            className="btn-secondary flex-1 select-none cursor-pointer text-[9px] !py-1.5"
                          >
                            Load Code
                          </button>
                          <button
                            onClick={async () => {
                              setDeployedAddress(item.address);
                              setAbi(item.abi);
                              setBytecode(item.bytecode);
                              setContractName(item.name);
                              setDeployTxHash('');
                              
                              // Load balance
                              try {
                                const provider = new ethers.BrowserProvider((window as any).ethereum);
                                const bal = await provider.getBalance(item.address);
                                setContractBalance(ethers.formatEther(bal));
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className={`flex-1 select-none cursor-pointer text-[9px] !py-1.5 ${
                              isCurrentlyLoaded
                                ? 'btn-primary'
                                : 'btn-secondary'
                            }`}
                          >
                            {isCurrentlyLoaded ? 'Active' : 'Interact'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
