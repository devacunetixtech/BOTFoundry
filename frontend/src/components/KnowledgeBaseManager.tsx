import React, { useState } from 'react';
import { 
  Database, 
  UploadCloud, 
  Globe, 
  FileText, 
  RefreshCw, 
  Trash2, 
  Search, 
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DocumentIndex {
  id: string;
  name: string;
  type: 'pdf' | 'url' | 'txt' | 'doc';
  source: string;
  embeddingsCount: number;
  fileSize: string;
  status: 'synced' | 'syncing' | 'failed';
  lastSynced: string;
}

export const KnowledgeBaseManager: React.FC = () => {
  const [indices, setIndices] = useState<DocumentIndex[]>([
    { id: '1', name: 'Solidity Audit Standards', type: 'pdf', source: 'solidity_standards_v0.8.pdf', embeddingsCount: 420, fileSize: '1.2 MB', status: 'synced', lastSynced: '10m ago' },
    { id: '2', name: 'BOT Chain Protocol Specs', type: 'url', source: 'https://docs.botchain.ai/evm-specs', embeddingsCount: 850, fileSize: '520 KB', status: 'synced', lastSynced: '2h ago' },
    { id: '3', name: 'Legal Oracle Draft Clauses', type: 'doc', source: 'contract_drafts_standard.docx', embeddingsCount: 120, fileSize: '85 KB', status: 'synced', lastSynced: '1d ago' },
    { id: '4', name: 'DeFi Vulnerability FAQ', type: 'pdf', source: 'defi_attacks_registry.pdf', embeddingsCount: 0, fileSize: '3.4 MB', status: 'syncing', lastSynced: 'Just now' },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUrlAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    const newIndex: DocumentIndex = {
      id: String(Date.now()),
      name: newUrl.replace('https://', '').split('/')[0] + ' Webdocs',
      type: 'url',
      source: newUrl,
      embeddingsCount: 0,
      fileSize: 'Pending',
      status: 'syncing',
      lastSynced: 'Just now'
    };

    setIndices(prev => [newIndex, ...prev]);
    setNewUrl('');

    // Simulate crawl sync progress
    setTimeout(() => {
      setIndices(current => current.map(item => item.id === newIndex.id ? {
        ...item,
        embeddingsCount: 140,
        fileSize: '120 KB',
        status: 'synced',
        lastSynced: 'Just now'
      } : item));
    }, 3000);
  };

  const handleFileUploadMock = () => {
    setUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);

          const newFile: DocumentIndex = {
            id: String(Date.now()),
            name: 'Uploaded PDF Spec',
            type: 'pdf',
            source: 'custom_knowledge_file.pdf',
            embeddingsCount: 380,
            fileSize: '2.1 MB',
            status: 'synced',
            lastSynced: 'Just now'
          };
          setIndices(prevList => [newFile, ...prevList]);
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  const handleDelete = (id: string) => {
    setIndices(prev => prev.filter(item => item.id !== id));
  };

  const triggerSyncRefresh = (id: string) => {
    setIndices(prev => prev.map(item => item.id === id ? { ...item, status: 'syncing' } : item));
    setTimeout(() => {
      setIndices(prev => prev.map(item => item.id === id ? { ...item, status: 'synced', lastSynced: 'Just now' } : item));
    }, 2000);
  };

  const filteredIndices = indices.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10">
      
      {/* Header Info */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest block mb-1">Knowledge Core</span>
          <h2 className="text-2xl font-bold tracking-tight text-brand-text-primary">Knowledge Base Manager</h2>
          <p className="text-xs text-brand-text-secondary mt-1">Configure the document embeddings, URLs, and vector databases used to contextualize your AI agents.</p>
        </div>
      </section>

      {/* Main Grid: Upload files left, Active indexes right */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Upload Document / URLs */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* File drag-and-drop container */}
          <div className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-2xl flex flex-col items-center justify-center text-center hover:border-brand-border/80 transition-all duration-300">
            <UploadCloud size={32} className="text-brand-text-secondary mb-4" />
            <h4 className="text-xs font-bold text-brand-text-primary">Upload Documents</h4>
            <p className="text-[10px] text-brand-text-secondary mt-1 max-w-[200px] leading-relaxed font-medium">
              Drag and drop files here, or click to upload. Supports PDF, TXT, DOCX files up to 10MB.
            </p>
            
            <button 
              onClick={handleFileUploadMock}
              disabled={uploading}
              className="btn-secondary select-none cursor-pointer text-xs mt-6"
            >
              {uploading ? `Vectorizing ${uploadProgress}%...` : 'Select File'}
            </button>
            
            {uploading && (
              <div className="w-full h-1 bg-brand-bg rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-brand-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
          </div>

          {/* Web Crawler Crawl index form */}
          <div className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-2xl space-y-4 hover:border-brand-border/80 transition-all duration-300">
            <h4 className="text-xs font-bold text-brand-text-primary flex items-center gap-1.5">
              <Globe size={13} className="text-brand-primary" />
              Crawl URL Source
            </h4>
            <p className="text-[10px] text-brand-text-secondary leading-relaxed font-medium">
              Provide an external documentation link. The parser will query web content and construct embeddings.
            </p>

            <form onSubmit={handleUrlAdd} className="space-y-3">
              <input 
                type="url" 
                placeholder="https://docs.soliditylang.org/" 
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                required
                className="input-field w-full text-xs placeholder-brand-text-secondary !rounded-xl"
              />
              <button 
                type="submit"
                className="btn-primary w-full text-xs select-none cursor-pointer flex items-center justify-center gap-1"
              >
                Crawl Website
                <ArrowRight size={12} />
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Active embeddings manager */}
        <div className="glass-panel-subtle p-6 bg-brand-surface border border-brand-border rounded-2xl lg:col-span-2 space-y-6 hover:border-brand-border/80 transition-all duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Connected Database Indices</h3>
            
            {/* Search filter input */}
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search size={12} className="text-brand-text-secondary" />
              </span>
              <input 
                type="text" 
                placeholder="Search active sources..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full text-[10px] placeholder-brand-text-secondary !pl-8.5 !py-1.5 !rounded-full"
              />
            </div>
          </div>

          <div className="space-y-3.5">
            <AnimatePresence mode="popLayout">
              {filteredIndices.map((item) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  key={item.id} 
                  className="bg-brand-bg/60 border border-brand-border/50 p-4.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-brand-border/80 transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center text-brand-text-secondary">
                      {item.type === 'pdf' && <FileText size={16} className="text-brand-primary" />}
                      {item.type === 'url' && <Globe size={16} className="text-cyan-400" />}
                      {item.type === 'doc' && <FileText size={16} className="text-indigo-400" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-brand-text-primary leading-tight">{item.name}</h4>
                      <div className="flex items-center gap-2.5 text-[9px] text-brand-text-secondary mt-1 font-medium font-mono">
                        <span>Source: {item.source.length > 30 ? item.source.substring(0, 30) + '...' : item.source}</span>
                        <span>•</span>
                        <span>Size: {item.fileSize}</span>
                        <span>•</span>
                        <span>Vectors: {item.embeddingsCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-brand-border/30">
                    <div className="flex items-center gap-1.5">
                      {item.status === 'syncing' ? (
                        <>
                          <Clock size={11} className="text-cyan-400 animate-spin" />
                          <span className="text-[9px] uppercase font-bold text-cyan-400 tracking-wider">Syncing</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={11} className="text-emerald-500" />
                          <span className="text-[9px] uppercase font-bold text-brand-text-secondary tracking-wider">Synced ({item.lastSynced})</span>
                        </>
                      )}
                    </div>

                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => triggerSyncRefresh(item.id)}
                        disabled={item.status === 'syncing'}
                        className="p-2 hover:bg-brand-surface border border-transparent hover:border-brand-border rounded-xl text-brand-text-secondary hover:text-brand-text-primary transition-all cursor-pointer"
                        title="Re-sync"
                      >
                        <RefreshCw size={11} className={item.status === 'syncing' ? 'animate-spin' : ''} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 hover:bg-brand-surface border border-transparent hover:border-brand-border rounded-xl text-brand-text-secondary hover:text-rose-500 transition-all cursor-pointer"
                        title="Delete index"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

      </section>
    </div>
  );
};
