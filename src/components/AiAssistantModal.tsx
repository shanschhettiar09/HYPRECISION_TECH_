import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  CheckCircle2,
  Database,
  ArrowRight,
  Shield,
  Layers,
  RefreshCw,
  HelpCircle,
  FileSpreadsheet,
  Lock,
} from 'lucide-react';
import type { ProductItem } from '../types.ts';

interface AiAssistantModalProps {
  initialPrompt?: string;
  products: ProductItem[];
  adminToken: string | null;
  onAdminTokenChange: (token: string | null) => void;
  onClose: () => void;
  onApplyFilter: (matchedSkus: string[]) => void;
  onCompareSkus: (skus: string[]) => void;
  onProductUpdated: () => void;
}

interface Message {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  matchedSkus?: string[];
  actionType?: 'ANSWER' | 'SEARCH_RESULTS' | 'EXECUTE_DB_COMMAND' | 'COMPARE_PRODUCTS' | 'INFORMATIONAL';
  executionStatus?: 'SUCCESS' | 'FAILED';
  command?: any;
  suggestedFollowUps?: string[];
  timestamp: string;
}

/**
 * Format markdown text (bold, bullet points, numbers) cleanly
 */
function FormattedText({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-2 text-xs leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Bullet point
        if (trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const bulletText = trimmed.replace(/^[•\-\*]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-[#FF6B52] font-bold mt-0.5">•</span>
              <span className="flex-1">{parseInlineFormatting(bulletText)}</span>
            </div>
          );
        }

        // Numbered list item
        const numMatch = trimmed.match(/^(\d+[\.\)])\s*(.+)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="mono text-[10px] font-bold text-[#FF6B52] mt-0.5">{numMatch[1]}</span>
              <span className="flex-1">{parseInlineFormatting(numMatch[2])}</span>
            </div>
          );
        }

        // Regular paragraph or header
        return <p key={idx}>{parseInlineFormatting(trimmed)}</p>;
      })}
    </div>
  );
}

function parseInlineFormatting(str: string): React.ReactNode {
  // Split on **bold** pattern
  const parts = str.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  initialPrompt = '',
  products,
  adminToken,
  onAdminTokenChange,
  onClose,
  onApplyFilter,
  onCompareSkus,
  onProductUpdated,
}) => {
  const [userRole, setUserRole] = useState<'buyer' | 'admin'>('buyer');
  const [showAdminAuthPrompt, setShowAdminAuthPrompt] = useState(false);
  const [authMode, setAuthMode] = useState<'unclaimed' | 'env' | 'claimed'>('claimed');
  const [authPasscode, setAuthPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-init',
      role: 'assistant',
      text: 'Welcome! I am Chrollo, the HY Precision Technology Naval & Marine Engineering Specialist.\n\nI actively analyze our live vessel and engineering inventory catalog to answer technical questions regarding naval patrol vessels, workboats, hydraulic screw pumps, 350 Bar bladder accumulators, 5-axis aerospace titanium machining, ASME Section VIII filtration skids, cavitation prevention, or execute database updates in Admin mode.\n\nWhat engineering question or catalog inquiry can I assist you with today?',
      suggestedFollowUps: [
        'How do three-spindle screw pumps work?',
        'What is the max working pressure of your bladder accumulator?',
        'Why choose Titanium Grade 5 over SS 316L for manifolds?',
        'What quality certifications and testing do you provide?',
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState(initialPrompt);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
    }
  }, []);

  const handleRequestAdminMode = async () => {
    if (adminToken) {
      setUserRole('admin');
      setShowAdminAuthPrompt(false);
      return;
    }
    setAuthError(null);
    try {
      const res = await fetch('/api/admin/auth/status');
      if (res.ok) {
        const data = await res.json();
        setAuthMode(data.mode || 'claimed');
      }
    } catch {
      setAuthMode('claimed');
    }
    setShowAdminAuthPrompt(true);
  };

  const handleAdminUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const endpoint = authMode === 'unclaimed' ? '/api/admin/auth/claim' : '/api/admin/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: authPasscode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
        return;
      }
      onAdminTokenChange(data.token);
      setUserRole('admin');
      setShowAdminAuthPrompt(false);
      setAuthPasscode('');
    } catch {
      setAuthError('Unable to reach authentication service.');
    } finally {
      setAuthLoading(false);
    }
  };

  /**
   * Query the server-side Gemini agent at /api/ai/query-manager
   */
  const queryBackendAssistant = async (
    query: string,
    historyPayload: Array<{ role: string; text: string }>
  ) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (userRole === 'admin' && adminToken) {
      headers.Authorization = `Bearer ${adminToken}`;
    }

    const res = await fetch('/api/ai/query-manager', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: query,
        history: historyPayload,
      }),
    });

    if (!res.ok) {
      throw new Error(`AI query failed with status: ${res.status}`);
    }

    return await res.json();
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isProcessing) return;

    const userMsg: Message = {
      id: 'm_' + Date.now(),
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      // Pass recent conversation history so Chrollo answers follow-up questions in context
      const historyPayload = messages
        .filter((m) => m.id !== 'm-init')
        .slice(-8)
        .map((m) => ({ role: m.role, text: m.text }));

      // Query server-side AI agent
      const data = await queryBackendAssistant(query, historyPayload);

      if (data.executionStatus === 'SUCCESS') {
        onProductUpdated();
      }

      const botMsg: Message = {
        id: 'bot_' + Date.now(),
        role: 'assistant',
        text: data.answer || data.explanation || 'Question answered.',
        matchedSkus: data.matchedSkus,
        actionType: data.action,
        executionStatus: data.executionStatus,
        command: data.command,
        suggestedFollowUps: data.suggestedFollowUps,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('AI assistant processing error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          role: 'assistant',
          text: 'Chrollo encountered an issue communicating with the engineering service. Please try again or rephrase your question.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const samplePrompts =
    userRole === 'buyer'
      ? [
          'How do three-spindle screw pumps work?',
          'What is the max pressure of your bladder accumulator?',
          'Why choose Titanium Grade 5 over SS 316L?',
          'What is cavitation and how do you prevent it?',
          'Where are your manufacturing facilities located?',
          'Find screw pumps with pressure over 30 Bar under $2000',
        ]
      : [
          'Update stock of HY-SP-40B to 25 units',
          'Set price of HY-ACC-BLD to $890',
          'Find all components with stock <= 5',
          'List available hydraulic pump SKUs',
        ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0">
      <div className="bg-[#18181B] w-full h-full flex flex-col overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#121215] text-white flex justify-between items-center shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-[#FF6B52] border border-white/10">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-editorial text-xl sm:text-2xl font-bold tracking-tight">
                  Chrollo
                </h3>
              </div>
              <p className="mono text-[10px] text-white/50 tracking-wider">
                Direct answers to engineering, metallurgy, cavitation & relational catalog queries
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white transition"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector Strip */}
        <div className="bg-[#18181B] px-5 py-2.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="mono text-[10px] text-zinc-400 uppercase font-semibold">
              Mode:
            </span>
            <button
              onClick={() => {
                setUserRole('buyer');
                setShowAdminAuthPrompt(false);
              }}
              className={`px-3 py-1 text-xs mono uppercase tracking-wider transition cursor-pointer border ${
                userRole === 'buyer'
                  ? 'bg-[#27272A] text-white border-white/20 font-bold'
                  : 'bg-transparent text-zinc-400 border-white/10 hover:border-white/25 hover:text-zinc-200'
              }`}
            >
              Buyer / Engineering Q&amp;A
            </button>
            <button
              onClick={handleRequestAdminMode}
              className={`px-3 py-1 text-xs mono uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer border ${
                userRole === 'admin'
                  ? 'bg-[#FF6B52] text-white border-[#FF6B52] font-bold'
                  : 'bg-transparent text-zinc-400 border-white/10 hover:border-white/25 hover:text-zinc-200'
              }`}
            >
              {adminToken ? <Database size={11} /> : <Lock size={11} />}
              <span>Admin / DB Manager</span>
            </button>
          </div>

          {showAdminAuthPrompt && (
            <form onSubmit={handleAdminUnlockSubmit} className="flex flex-wrap items-center gap-2">
              <input
                type="password"
                required
                value={authPasscode}
                onChange={(e) => setAuthPasscode(e.target.value)}
                placeholder={authMode === 'unclaimed' ? 'Create admin passcode (8+ chars)...' : 'Enter admin passcode...'}
                className="px-3 py-1 bg-[#232329] border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF6B52]"
              />
              <button
                type="submit"
                disabled={authLoading}
                className="px-3 py-1 bg-[#FF6B52] hover:bg-[#F0543B] text-white mono text-[10px] uppercase font-bold cursor-pointer"
              >
                {authLoading ? '...' : authMode === 'unclaimed' ? 'Set & Unlock' : 'Unlock'}
              </button>
              <button
                type="button"
                onClick={() => setShowAdminAuthPrompt(false)}
                className="px-2 py-1 text-zinc-400 hover:text-white mono text-[10px] uppercase cursor-pointer"
              >
                Cancel
              </button>
              {authError && <span className="text-rose-400 mono text-[10px]">{authError}</span>}
            </form>
          )}
        </div>

        {/* Message Thread */}
        <div ref={scrollRef} className="flex-1 p-5 overflow-y-auto space-y-5 bg-[#141417] text-xs">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 bg-[#232329] text-[#FF6B52] flex items-center justify-center shrink-0 border border-white/10 mt-1">
                  <Bot size={16} />
                </div>
              )}

              <div
                className={`max-w-[88%] p-4 space-y-3 shadow-xs ${
                  m.role === 'user'
                    ? 'bg-[#27272A] border border-white/10 text-white'
                    : 'bg-[#1E1E24] border border-white/10 text-zinc-100'
                }`}
              >
                {/* Formatted Message Body */}
                <FormattedText content={m.text} />

                {/* Successful DB Execution Badge */}
                {m.executionStatus === 'SUCCESS' && (
                  <div className="mt-2 p-2.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 flex items-center gap-2 mono text-[11px]">
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    <span>Relational database transaction committed to SQLite storage.</span>
                  </div>
                )}

                {/* Matched SKUs Action Bar */}
                {m.matchedSkus && m.matchedSkus.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
                    <span className="mono text-[9px] text-zinc-400 uppercase font-bold mr-1">
                      Related:
                    </span>
                    <button
                      onClick={() => {
                        onApplyFilter(m.matchedSkus!);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-[#27272A] hover:bg-[#FF6B52] text-white border border-white/15 text-[10px] mono uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Layers size={11} />
                      <span>Filter Catalog ({m.matchedSkus.length})</span>
                    </button>

                    {m.matchedSkus.length >= 2 && (
                      <button
                        onClick={() => {
                          onCompareSkus(m.matchedSkus!.slice(0, 3));
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-[#232329] hover:bg-[#2F2F37] text-zinc-100 border border-white/15 text-[10px] mono uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Sparkles size={11} className="text-[#FF6B52]" />
                        <span>Compare Side-by-Side</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Suggested Follow-Up Questions */}
                {m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                    <div className="mono text-[9px] text-[#FF6B52] font-bold uppercase flex items-center gap-1">
                      <HelpCircle size={10} /> Suggested Follow-ups:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {m.suggestedFollowUps.map((q, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => handleSend(q)}
                          className="text-[11px] px-2.5 py-1 bg-[#27272A] hover:bg-[#32323A] hover:text-white border border-white/10 text-zinc-200 transition text-left cursor-pointer"
                        >
                          "{q}"
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className={`mono text-[9px] text-right pt-1 ${
                    m.role === 'user' ? 'text-white/50' : 'text-zinc-500'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>

              {m.role === 'user' && (
                <div className="w-8 h-8 bg-[#FF6B52] text-white flex items-center justify-center shrink-0 font-bold mt-1">
                  <User size={15} />
                </div>
              )}
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 text-zinc-300 mono text-[11px] italic pl-11">
              <RefreshCw size={13} className="animate-spin text-[#FF6B52]" />
              <span>Chrollo is analyzing engineering principles and live database...</span>
            </div>
          )}
        </div>

        {/* Suggestion Question Chips */}
        <div className="p-3 bg-[#18181B] border-t border-white/10 shrink-0">
          <div className="mono text-[9px] font-bold text-zinc-400 uppercase mb-1.5">
            Ask an engineering or inventory question:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {samplePrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSend(p)}
                className="mono text-[10px] px-2.5 py-1 bg-[#232329] hover:bg-[#2F2F37] hover:text-white border border-white/10 text-zinc-200 transition text-left cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3.5 bg-[#18181B] border-t border-white/10 flex gap-2 shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={
              userRole === 'buyer'
                ? 'Ask any question: "How do screw pumps work?", "What is cavitation?", "Compare specs"...'
                : 'Admin command: "Update stock of HY-SP-40B to 30", "Change price of HY-ACC-BLD to $890"...'
            }
            className="flex-1 px-4 py-2.5 border border-white/15 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#FF6B52] bg-[#232329]"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isProcessing}
            className={`px-6 py-2.5 text-xs mono uppercase tracking-wider font-bold flex items-center gap-1.5 transition cursor-pointer ${
              input.trim() && !isProcessing
                ? 'bg-[#FF6B52] hover:bg-[#F0543B] text-white shadow-xs'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            <span>Send</span>
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
