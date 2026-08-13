import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Plus, 
  Trash2, 
  Database, 
  Cpu, 
  Globe, 
  HardDrive, 
  Zap, 
  ArrowRight, 
  Terminal, 
  History, 
  Eye, 
  Save,
  Maximize2,
  CheckCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'ai' | 'knowledge' | 'api' | 'memory' | 'action';
  name: string;
  x: number;
  y: number;
  config: Record<string, any>;
}

interface Connection {
  id: string;
  fromId: string;
  toId: string;
}

interface VisualBuilderProps {
  agentName?: string;
  onSave?: (nodes: WorkflowNode[], connections: Connection[]) => void;
}

export const VisualBuilder: React.FC<VisualBuilderProps> = ({ 
  agentName = 'Custom AI Agent', 
  onSave 
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    { id: '1', type: 'trigger', name: 'On-Chain Payment Event', x: 80, y: 180, config: { event: 'payForAgentRequest' } },
    { id: '2', type: 'ai', name: 'LLM Orchestrator', x: 320, y: 180, config: { model: 'gemini-1.5-pro', temperature: 0.2 } },
    { id: '3', type: 'knowledge', name: 'Solidity Security FAQ', x: 320, y: 340, config: { index: 'solidity-vector-index' } },
    { id: '4', type: 'action', name: 'Execute Callback / Response', x: 600, y: 180, config: { action: 'respond' } },
  ]);
  
  const [connections, setConnections] = useState<Connection[]>([
    { id: 'c1', fromId: '1', toId: '2' },
    { id: 'c2', fromId: '3', toId: '2' },
    { id: 'c3', fromId: '2', toId: '4' },
  ]);

  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [activeSidePanel, setActiveSidePanel] = useState<'config' | 'test' | 'versions' | 'preview'>('config');
  const [testInput, setTestInput] = useState('');
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [testRunning, setTestRunning] = useState(false);
  const [versions, setVersions] = useState([
    { version: 'v1.0.0', date: '2026-08-05 10:12', comment: 'Initial registry deploy' },
    { version: 'v1.0.1', date: '2026-08-05 12:45', comment: 'Optimized system instruction latency' }
  ]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const triggerNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => prev?.message === message ? null : prev);
    }, 5000);
  };

  // Node connection builder state
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  const addNode = (type: WorkflowNode['type']) => {
    const defaultNames: Record<WorkflowNode['type'], string> = {
      trigger: 'On-Chain Transaction Trigger',
      ai: 'Cognitive Engine',
      knowledge: 'Vector Document Source',
      api: 'API Integrator webhook',
      memory: 'Long-term Vector Memory',
      action: 'Treasury Payout Event'
    };

    const newNode: WorkflowNode = {
      id: String(Date.now()),
      type,
      name: defaultNames[type],
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
      config: {}
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNode(newNode);
    setActiveSidePanel('config');
  };

  const deleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.fromId !== id && c.toId !== id));
    if (selectedNode?.id === id) {
      setSelectedNode(null);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedNode(null);
      setConnectingFromId(null);
    }
  };

  const startConnection = (fromId: string) => {
    setConnectingFromId(fromId);
  };

  const endConnection = (toId: string) => {
    if (connectingFromId && connectingFromId !== toId) {
      // Check if duplicate connection
      const exists = connections.some(c => c.fromId === connectingFromId && c.toId === toId);
      if (!exists) {
        setConnections(prev => [...prev, {
          id: `c_${Date.now()}`,
          fromId: connectingFromId,
          toId
        }]);
      }
    }
    setConnectingFromId(null);
  };

  // Run the workflow test runner step-by-step
  const runTestSimulation = () => {
    if (!testInput.trim()) return;
    setTestRunning(true);
    setTestLogs([]);
    
    const steps = [
      `[Trigger] Received payload: "${testInput}"`,
      `[Memory] Querying past execution context...`,
      `[Knowledge] Extracting vector chunks from Solidity Security FAQ index`,
      `[Cognitive Engine] Dispatching query to Gemini model...`,
      `[API Connector] Validating smart contract state on BOT Chain...`,
      `[Action] Payout request settled. Return payload delivered successfully.`
    ];

    steps.forEach((stepText, idx) => {
      setTimeout(() => {
        setTestLogs(prev => [...prev, stepText]);
        if (idx === steps.length - 1) {
          setTestRunning(false);
          // Highlight success with a nice GSAP ticker animation
          gsap.fromTo('.success-banner', { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.5 });
        }
      }, (idx + 1) * 800);
    });
  };

  // Node position updater
  const updateNodePosition = (id: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  };

  const updateNodeConfig = (updated: WorkflowNode) => {
    setNodes(prev => prev.map(n => n.id === updated.id ? updated : n));
    setSelectedNode(updated);
  };

  return (
    <div className="glass-panel-subtle bg-brand-surface border border-brand-border rounded-3xl h-[700px] overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_360px] relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className={`fixed top-24 right-4 sm:right-8 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border backdrop-blur-md max-w-sm ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400'
                : notification.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/30 text-rose-400'
                : 'bg-cyan-950/80 border-cyan-500/30 text-cyan-400'
            }`}
          >
            {notification.type === 'success' && <CheckCircle size={16} />}
            {notification.type === 'error' && <Zap size={16} className="text-rose-400" />}
            {notification.type === 'info' && <Sparkles size={16} className="text-cyan-400" />}
            <span className="text-xs font-semibold leading-relaxed">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Visual Canvas Panel */}
      <div className="flex flex-col h-full relative select-none">
        
        {/* Canvas Toolbar Header */}
        <div className="px-6 py-4 border-b border-brand-border bg-brand-surface/90 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xs font-bold text-brand-text-primary flex items-center gap-1.5">
              <Sparkles size={13} className="text-brand-primary" />
              {agentName}
            </h2>
            <p className="text-[10px] text-brand-text-secondary mt-0.5 font-medium">Visual no-code logic builder grid</p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => {
                triggerNotification('success', 'Workflow configuration saved locally.');
                if (onSave) onSave(nodes, connections);
              }}
              className="inline-flex items-center gap-1 bg-brand-surface hover:bg-brand-elevated text-brand-text-primary border border-brand-border px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer"
            >
              <Save size={11} />
              Save Layout
            </button>
            <button 
              onClick={() => setActiveSidePanel('test')}
              className="inline-flex items-center gap-1 bg-brand-primary hover:bg-brand-primary/95 text-white px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer"
            >
              <Play size={11} className="fill-current" />
              Test Run
            </button>
          </div>
        </div>

        {/* Node Drawer / Palette Bar */}
        <div className="absolute top-20 left-6 z-10 flex flex-col gap-2 p-2 bg-brand-surface/90 border border-brand-border rounded-2xl shadow-md">
          <span className="text-[8px] uppercase tracking-wider font-bold text-brand-text-secondary px-2 mb-1 block">Add Nodes</span>
          <button 
            onClick={() => addNode('trigger')} 
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-bg hover:bg-brand-elevated border border-brand-border/60 text-[10px] font-semibold text-brand-text-primary text-left cursor-pointer"
          >
            <Zap size={11} className="text-amber-400" />
            Trigger Event
          </button>
          <button 
            onClick={() => addNode('ai')} 
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-bg hover:bg-brand-elevated border border-brand-border/60 text-[10px] font-semibold text-brand-text-primary text-left cursor-pointer"
          >
            <Cpu size={11} className="text-brand-primary" />
            Cognitive Node
          </button>
          <button 
            onClick={() => addNode('knowledge')} 
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-bg hover:bg-brand-elevated border border-brand-border/60 text-[10px] font-semibold text-brand-text-primary text-left cursor-pointer"
          >
            <Database size={11} className="text-cyan-400" />
            Knowledge Index
          </button>
          <button 
            onClick={() => addNode('api')} 
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-bg hover:bg-brand-elevated border border-brand-border/60 text-[10px] font-semibold text-brand-text-primary text-left cursor-pointer"
          >
            <Globe size={11} className="text-indigo-400" />
            API Connector
          </button>
          <button 
            onClick={() => addNode('memory')} 
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-bg hover:bg-brand-elevated border border-brand-border/60 text-[10px] font-semibold text-brand-text-primary text-left cursor-pointer"
          >
            <HardDrive size={11} className="text-emerald-400" />
            Vector Memory
          </button>
          <button 
            onClick={() => addNode('action')} 
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-bg hover:bg-brand-elevated border border-brand-border/60 text-[10px] font-semibold text-brand-text-primary text-left cursor-pointer"
          >
            <ArrowRight size={11} className="text-rose-400" />
            Action Event
          </button>
        </div>

        {/* Drag Grid Canvas */}
        <div 
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="flex-grow bg-brand-bg relative overflow-hidden cursor-crosshair"
          style={{
            backgroundImage: `radial-gradient(var(--border-color) 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        >
          {/* SVG Connection Drawer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 2 L 8 5 L 0 8 z" fill="var(--text-secondary)" />
              </marker>
            </defs>

            {connections.map(c => {
              const fromNode = nodes.find(n => n.id === c.fromId);
              const toNode = nodes.find(n => n.id === c.toId);
              if (!fromNode || !toNode) return null;

              // Node dimensions (width ~180px, height ~70px)
              const startX = fromNode.x + 180;
              const startY = fromNode.y + 35;
              const endX = toNode.x;
              const endY = toNode.y + 35;

              // Calculate control points for smooth bezier curves
              const cpX1 = startX + 60;
              const cpY1 = startY;
              const cpX2 = endX - 60;
              const cpY2 = endY;

              return (
                <g key={c.id}>
                  <path 
                    d={`M ${startX} ${startY} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${endX} ${endY}`} 
                    fill="none" 
                    stroke="var(--border-color)" 
                    strokeWidth="1.8"
                    markerEnd="url(#arrow)"
                  />
                  {/* Subtle pulsing dash for active simulation */}
                  <path 
                    d={`M ${startX} ${startY} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${endX} ${endY}`} 
                    fill="none" 
                    stroke="var(--primary)" 
                    strokeWidth="1.8"
                    strokeDasharray="4 8"
                    className="animate-pulse-subtle"
                  />
                </g>
              );
            })}
          </svg>

          {/* Draggable Node Components */}
          {nodes.map(node => (
            <motion.div
              drag
              dragMomentum={false}
              dragElastic={0}
              onDrag={(e, info) => {
                if (canvasRef.current) {
                  const rect = canvasRef.current.getBoundingClientRect();
                  updateNodePosition(node.id, node.x + info.delta.x, node.y + info.delta.y);
                }
              }}
              key={node.id}
              style={{ left: node.x, top: node.y }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNode(node);
                setActiveSidePanel('config');
              }}
              className={`absolute w-[180px] p-3 rounded-2xl bg-brand-surface border text-xs shadow-sm flex flex-col justify-between cursor-grab active:cursor-grabbing group z-10 ${
                selectedNode?.id === node.id 
                  ? 'border-brand-primary shadow-md' 
                  : 'border-brand-border/80 hover:border-brand-text-secondary/40'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  {node.type === 'trigger' && <Zap size={11} className="text-amber-400 flex-shrink-0" />}
                  {node.type === 'ai' && <Cpu size={11} className="text-brand-primary flex-shrink-0" />}
                  {node.type === 'knowledge' && <Database size={11} className="text-cyan-400 flex-shrink-0" />}
                  {node.type === 'api' && <Globe size={11} className="text-indigo-400 flex-shrink-0" />}
                  {node.type === 'memory' && <HardDrive size={11} className="text-emerald-400 flex-shrink-0" />}
                  {node.type === 'action' && <ArrowRight size={11} className="text-rose-400 flex-shrink-0" />}
                  
                  <span className="font-bold truncate text-[10px] text-brand-text-primary">{node.name}</span>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNode(node.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-brand-bg rounded-lg text-brand-text-secondary hover:text-rose-500 transition-opacity"
                >
                  <Trash2 size={9} />
                </button>
              </div>

              {/* Node connection anchors */}
              <div className="flex justify-between items-center mt-3 pt-2 border-t border-brand-border/40">
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    endConnection(node.id);
                  }}
                  className="w-2.5 h-2.5 rounded-full bg-brand-border/60 hover:bg-brand-primary cursor-pointer border border-brand-surface -ml-1.5 flex items-center justify-center text-[7px]"
                  title="Connect Target"
                />
                
                <span className="text-[8px] text-brand-text-secondary uppercase font-bold tracking-wider">
                  {node.type}
                </span>

                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    startConnection(node.id);
                  }}
                  className="w-2.5 h-2.5 rounded-full bg-brand-border/60 hover:bg-brand-primary cursor-pointer border border-brand-surface -mr-1.5"
                  title="Drag connection"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Side Inspector Panel (Settings, Tests, Revisions) */}
      <div className="border-l border-brand-border flex flex-col justify-between h-full bg-brand-surface/50">
        
        {/* Right Tab Selectors */}
        <div className="flex border-b border-brand-border bg-brand-surface p-1">
          <button 
            onClick={() => setActiveSidePanel('config')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeSidePanel === 'config' 
                ? 'bg-brand-bg text-brand-text-primary' 
                : 'text-brand-text-secondary hover:text-brand-text-primary'
            }`}
          >
            Node Settings
          </button>
          <button 
            onClick={() => setActiveSidePanel('test')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeSidePanel === 'test' 
                ? 'bg-brand-bg text-brand-text-primary' 
                : 'text-brand-text-secondary hover:text-brand-text-primary'
            }`}
          >
            Console
          </button>
          <button 
            onClick={() => setActiveSidePanel('versions')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeSidePanel === 'versions' 
                ? 'bg-brand-bg text-brand-text-primary' 
                : 'text-brand-text-secondary hover:text-brand-text-primary'
            }`}
          >
            Versions
          </button>
        </div>

        {/* Dynamic Panels */}
        <div className="flex-grow p-6 overflow-y-auto min-h-0">
          
          {/* Node Config Panel */}
          {activeSidePanel === 'config' && (
            <div className="space-y-6">
              {selectedNode ? (
                <>
                  <div>
                    <span className="text-[8px] font-bold text-brand-primary uppercase tracking-widest block mb-1">Inspector</span>
                    <h3 className="text-xs font-bold text-brand-text-primary">{selectedNode.name}</h3>
                    <p className="text-[10px] text-brand-text-secondary mt-0.5 font-medium">Node Type: {selectedNode.type}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-brand-text-secondary">Node Display Name</label>
                    <input 
                      type="text" 
                      value={selectedNode.name}
                      onChange={(e) => updateNodeConfig({ ...selectedNode, name: e.target.value })}
                      className="w-full bg-brand-bg/50 border border-brand-border px-3 py-2 rounded-xl text-[11px] focus:outline-none focus:border-brand-primary text-brand-text-primary"
                    />
                  </div>

                  {selectedNode.type === 'ai' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-brand-text-secondary">LLM Model Target</label>
                        <select 
                          value={selectedNode.config.model || 'gemini-1.5-pro'}
                          onChange={(e) => updateNodeConfig({ 
                            ...selectedNode, 
                            config: { ...selectedNode.config, model: e.target.value } 
                          })}
                          className="w-full bg-brand-bg border border-brand-border px-3 py-2 rounded-xl text-[11px] text-brand-text-primary"
                        >
                          <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                          <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                          <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-[9px] uppercase font-bold text-brand-text-secondary">
                          <span>Temperature</span>
                          <span className="font-mono text-brand-primary">{selectedNode.config.temperature || 0.2}</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="1.0" 
                          step="0.1"
                          value={selectedNode.config.temperature || 0.2}
                          onChange={(e) => updateNodeConfig({ 
                            ...selectedNode, 
                            config: { ...selectedNode.config, temperature: parseFloat(e.target.value) } 
                          })}
                          className="w-full h-1 bg-brand-bg rounded-lg cursor-pointer accent-brand-primary"
                        />
                      </div>
                    </div>
                  )}

                  {selectedNode.type === 'knowledge' && (
                    <div className="space-y-2">
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-brand-text-secondary">Knowledge Index</label>
                      <select 
                        value={selectedNode.config.index || 'solidity-vector-index'}
                        onChange={(e) => updateNodeConfig({ 
                          ...selectedNode, 
                          config: { ...selectedNode.config, index: e.target.value } 
                        })}
                        className="w-full bg-brand-bg border border-brand-border px-3 py-2 rounded-xl text-[11px] text-brand-text-primary"
                      >
                        <option value="solidity-vector-index">Solidity Security FAQ</option>
                        <option value="legal-contracts-index">EVM Legal Templates</option>
                        <option value="general-help-index">General API Documents</option>
                      </select>
                    </div>
                  )}

                  {selectedNode.type === 'trigger' && (
                    <div className="space-y-2">
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-brand-text-secondary">Trigger Function Name</label>
                      <input 
                        type="text" 
                        value={selectedNode.config.event || ''}
                        onChange={(e) => updateNodeConfig({ 
                          ...selectedNode, 
                          config: { ...selectedNode.config, event: e.target.value } 
                        })}
                        placeholder="e.g. payForAgentRequest"
                        className="w-full bg-brand-bg/50 border border-brand-border px-3 py-2 rounded-xl text-[11px] focus:outline-none focus:border-brand-primary text-brand-text-primary"
                      />
                    </div>
                  )}

                  <div className="pt-4">
                    <button 
                      onClick={() => deleteNode(selectedNode.id)}
                      className="w-full flex items-center justify-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                    >
                      <Trash2 size={11} />
                      Remove Node
                    </button>
                  </div>
                </>
              ) : (
                <div className="h-[400px] flex flex-col items-center justify-center text-center gap-3 text-brand-text-secondary">
                  <Maximize2 size={24} className="text-brand-border" />
                  <div>
                    <h4 className="text-[11px] font-semibold text-brand-text-primary">No Node Selected</h4>
                    <p className="text-[10px] mt-1 max-w-[200px] leading-relaxed">Select any active canvas card component to view and adjust its properties here.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Testing Console Panel */}
          {activeSidePanel === 'test' && (
            <div className="space-y-6">
              <div>
                <span className="text-[8px] font-bold text-brand-primary uppercase tracking-widest block mb-1">Developer Utilities</span>
                <h3 className="text-xs font-bold text-brand-text-primary">Workflow Tester</h3>
                <p className="text-[10px] text-brand-text-secondary mt-0.5 font-medium">Verify execution paths and mock outputs.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-brand-text-secondary">Test Prompt Input</label>
                <textarea 
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="e.g. Audit this Solidity contract code..."
                  className="w-full bg-brand-bg/50 border border-brand-border p-3 rounded-xl text-[11px] focus:outline-none focus:border-brand-primary text-brand-text-primary min-h-[90px] resize-none"
                />
              </div>

              <button 
                onClick={runTestSimulation}
                disabled={testRunning || !testInput.trim()}
                className="w-full flex items-center justify-center gap-1 bg-brand-text-primary text-brand-bg hover:bg-brand-text-primary/90 py-2.5 rounded-xl text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {testRunning ? 'Simulating Trace...' : 'Run Simulation'}
              </button>

              {/* Console logs output */}
              {(testLogs.length > 0 || testRunning) && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[9px] uppercase font-bold text-brand-text-secondary">
                    <span>Execution logs</span>
                    <Terminal size={11} className="text-brand-primary" />
                  </div>
                  
                  <div className="bg-brand-bg border border-brand-border p-3 rounded-xl font-mono text-[9px] space-y-2 text-brand-text-secondary max-h-[220px] overflow-y-auto">
                    {testLogs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed">
                        <span className="text-brand-primary font-bold">&gt;</span> {log}
                      </div>
                    ))}
                    {testRunning && (
                      <div className="flex items-center gap-1.5 text-brand-text-secondary">
                        <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-pulse" />
                        <span>evaluating node connectors...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Versions History Panel */}
          {activeSidePanel === 'versions' && (
            <div className="space-y-6">
              <div>
                <span className="text-[8px] font-bold text-brand-primary uppercase tracking-widest block mb-1">Git Repository</span>
                <h3 className="text-xs font-bold text-brand-text-primary">Version Revisions</h3>
                <p className="text-[10px] text-brand-text-secondary mt-0.5 font-medium">Registry deploy history on BOT Chain.</p>
              </div>

              <div className="space-y-3">
                {versions.map((v, idx) => (
                  <div key={idx} className="bg-brand-bg/50 border border-brand-border/60 p-3 rounded-xl flex flex-col gap-1.5 text-[10px] font-medium">
                    <div className="flex justify-between font-bold">
                      <span className="text-brand-text-primary">{v.version}</span>
                      <span className="text-brand-primary text-[9px]">{v.date}</span>
                    </div>
                    <p className="text-brand-text-secondary leading-snug">{v.comment}</p>
                    <div className="flex gap-2 mt-1">
                      <button 
                        onClick={() => triggerNotification('success', `Reverted canvas to ${v.version}`)}
                        className="text-[9px] font-bold text-brand-primary hover:underline"
                      >
                        Restore
                      </button>
                      <button 
                        onClick={() => triggerNotification('info', `Showing JSON blueprint for ${v.version}`)}
                        className="text-[9px] font-bold text-brand-text-secondary hover:underline"
                      >
                        View Code
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer help hint */}
        <div className="p-6 border-t border-brand-border bg-brand-bg/20 flex gap-2 items-start text-[10px] text-brand-text-secondary font-medium">
          <HelpCircle size={13} className="text-brand-primary flex-shrink-0 mt-0.5" />
          <span>Click any node's right socket handle to initiate links, and drop on a target node's left socket handle to bind workflow parameters.</span>
        </div>
      </div>
    </div>
  );
};
