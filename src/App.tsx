import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Calculator as CalcIcon, 
  Grid3X3, 
  BarChart3, 
  ArrowLeftRight, 
  LineChart, 
  History as HistoryIcon, 
  Sun, 
  Moon, 
  Settings, 
  X, 
  ChevronRight, 
  ChevronDown, 
  Trash2, 
  Copy, 
  Check, 
  AlertCircle,
  Info,
  Maximize2,
  Minimize2,
  Paperclip,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Camera,
  Send,
  Bot,
  User as UserIcon,
  Sparkles,
  SendHorizontal,
  Plus,
  MoreVertical,
  History,
  Menu,
  MessageSquare,
  Mic,
  MicOff,
  Eye,
  EyeOff,
  KeyRound,
  Download,
  WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as math from 'mathjs';
import { 
  LineChart as ReLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area
} from 'recharts';
import { GoogleGenAI } from "@google/genai";

import { 
  Mode, 
  HistoryItem, 
  evaluateExpression, 
  matrixOperations, 
  statsOperations, 
  engineeringConverter 
} from './utils/math';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
  files?: Array<{ name: string, type: string, url: string }>;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

// --- Components ---

const GlassCard = ({ children, className, title, icon: Icon, collapsible = false }: { children: React.ReactNode, className?: string, title?: string, icon?: any, collapsible?: boolean, key?: React.Key }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <div 
      className={cn(
        "rounded-[2rem] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[0_10px_30px_-4px_rgba(0,0,0,0.04)] dark:shadow-[0_15px_35px_-5px_rgba(0,0,0,0.3)] backdrop-blur-xl overflow-hidden transition-all duration-300",
        className
      )}
    >
      {title && (
        <div 
          className={cn(
            "flex items-center justify-between p-5 border-b border-[var(--card-border)] bg-[var(--muted)]/30",
            collapsible && "cursor-pointer hover:bg-[var(--muted)]/50 transition-colors"
          )}
          onClick={() => collapsible && setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-3">
            {Icon && <Icon size={18} className="text-[var(--accent)]" />}
            <h3 className="text-sm font-bold uppercase tracking-wider opacity-80">
              {title}
            </h3>
          </div>
          {collapsible && (
            <ChevronDown size={16} className={cn("transition-transform opacity-40 duration-300", !isOpen && "-rotate-90")} />
          )}
        </div>
      )}
      {isOpen && <div className="p-6 md:p-8">{children}</div>}
    </div>
  );
};

const Button = ({ children, onClick, variant = 'primary', className, disabled, size = 'md', type = 'button' }: { children: React.ReactNode, onClick?: () => void, variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent', className?: string, disabled?: boolean, size?: 'sm' | 'md' | 'lg', type?: 'button' | 'submit' | 'reset', key?: React.Key }) => {
  const variants = {
    primary: "bg-[var(--accent)] text-white shadow-[0_4px_14px_0_rgba(30,64,175,0.39)] dark:shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(30,64,175,0.23)] dark:hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] hover:-translate-y-0.5",
    secondary: "bg-[var(--card-bg)] text-[var(--text)] border border-[var(--card-border)] hover:bg-[var(--muted)] hover:shadow-md hover:-translate-y-0.5 backdrop-blur-md",
    ghost: "bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--text)]",
    danger: "bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white hover:shadow-[0_4px_14px_0_rgba(244,63,94,0.39)] hover:-translate-y-0.5",
    accent: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white hover:shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:-translate-y-0.5"
  };
  
  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-5 py-3 text-lg",
    lg: "px-8 py-4 text-xl"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 active:scale-95",
        variants[variant],
        sizes[size],
        disabled && "opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-none",
        className
      )}
    >
      {children}
    </button>
  );
};

// --- Main App ---

export default function App() {
  const [mode, setMode] = useState<Mode>('Scientific');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calcify-theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isDegree, setIsDegree] = useState(true);
  const [isShifted, setIsShifted] = useState(false);
  const [isCmplxMode, setIsCmplxMode] = useState(false);
  const [isOptnMode, setIsOptnMode] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // AI Assistant State
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: 'default',
      title: 'New Chat',
      messages: [
        { id: '1', role: 'ai', content: 'Calcify AI Assistant. Ready for calculations.', timestamp: Date.now() }
      ],
      timestamp: Date.now()
    }
  ]);
  const [activeSessionId, setActiveSessionId] = useState('default');
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const contactFormRef = useRef<HTMLFormElement>(null);

  // AI Mode State
  const [aiMode, setAiMode] = useState<'normal' | 'api'>('normal');
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
  const [isApiPanelOpen, setIsApiPanelOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  // PWA + Network State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const activeSession = chatSessions.find(s => s.id === activeSessionId) || chatSessions[0];
  const messages = activeSession.messages;

  useEffect(() => {
    if (mode === 'AI Assistant') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, mode]);

  // --- Online / Offline Detection ---
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // --- PWA Install Prompt ---
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setShowInstallBanner(false));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    }
  };

  // Theme Sync
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('calcify-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('calcify-theme', 'light');
    }
  }, [isDarkMode]);
  
  // Calculator State
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Matrix State
  const [matrices, setMatrices] = useState<Array<{ id: string, name: string, rows: number, cols: number, data: number[][] }>>([
    { id: 'A', name: 'Matrix A', rows: 2, cols: 2, data: [[0, 0], [0, 0]] },
    { id: 'B', name: 'Matrix B', rows: 2, cols: 2, data: [[0, 0], [0, 0]] }
  ]);
  const [selectedMatrix1, setSelectedMatrix1] = useState('A');
  const [selectedMatrix2, setSelectedMatrix2] = useState('B');
  const [matrixResult, setMatrixResult] = useState<number[][] | number | null>(null);
  const [matrixOpLabel, setMatrixOpLabel] = useState('');

  const updateMatrixSize = (id: string, rows: number, cols: number) => {
    setMatrices(prev => prev.map(m => {
      if (m.id === id) {
        const newData = Array(rows).fill(0).map((_, i) => 
          Array(cols).fill(0).map((_, j) => (m.data[i] && m.data[i][j]) || 0)
        );
        return { ...m, rows, cols, data: newData };
      }
      return m;
    }));
  };

  const updateMatrixValue = (id: string, r: number, c: number, val: number) => {
    setMatrices(prev => prev.map(m => {
      if (m.id === id) {
        const newData = [...m.data];
        newData[r][c] = val;
        return { ...m, data: newData };
      }
      return m;
    }));
  };

  const addMatrix = () => {
    const nextId = String.fromCharCode(65 + matrices.length);
    if (matrices.length >= 6) return; // Limit to 6 matrices for UI sanity
    setMatrices(prev => [...prev, {
      id: nextId,
      name: `Matrix ${nextId}`,
      rows: 2,
      cols: 2,
      data: [[0, 0], [0, 0]]
    }]);
  };

  const removeMatrix = (id: string) => {
    if (matrices.length <= 1) return;
    setMatrices(prev => {
      const filtered = prev.filter(m => m.id !== id);
      // Re-index names to keep them sequential A, B, C...
      const reindexed = filtered.map((m, index) => {
        const newId = String.fromCharCode(65 + index);
        return { ...m, id: newId, name: `Matrix ${newId}` };
      });
      return reindexed;
    });
    
    // Reset selections to ensure they point to existing matrices
    setSelectedMatrix1('A');
    setSelectedMatrix2('B');
    if (matrices.length === 2) {
      // If we had 2 and removed 1, only A remains
      setSelectedMatrix2('A');
    }
  };

  const handleMatrixOp = (op: string) => {
    setError(null);
    try {
      const m1Obj = matrices.find(m => m.id === selectedMatrix1);
      const m2Obj = matrices.find(m => m.id === selectedMatrix2);
      
      if (!m1Obj || !m2Obj) {
        throw new Error("Selected matrix not found");
      }

      const m1 = m1Obj.data;
      const m2 = m2Obj.data;
      let res: any;
      let label = '';

      switch(op) {
        case 'det': res = matrixOperations.determinant(m1); label = `det(${selectedMatrix1})`; break;
        case 'inv': res = matrixOperations.inverse(m1); label = `${selectedMatrix1}⁻¹`; break;
        case 'trans': res = matrixOperations.transpose(m1); label = `${selectedMatrix1}ᵀ`; break;
        case 'add': res = matrixOperations.add(m1, m2); label = `${selectedMatrix1} + ${selectedMatrix2}`; break;
        case 'sub': res = matrixOperations.subtract(m1, m2); label = `${selectedMatrix1} - ${selectedMatrix2}`; break;
        case 'mul': res = matrixOperations.multiply(m1, m2); label = `${selectedMatrix1} × ${selectedMatrix2}`; break;
      }
      setMatrixResult(res);
      setMatrixOpLabel(label);
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Statistics State
  const [statsData, setStatsData] = useState('');
  const [statsResult, setStatsResult] = useState<any>(null);
  const [probN, setProbN] = useState(0);
  const [probR, setProbR] = useState(0);
  const [probResult, setProbResult] = useState<{ label: string, val: number } | null>(null);

  const handleProb = (type: 'fact' | 'nPr' | 'nCr') => {
    setError(null);
    try {
      let val = 0;
      let label = '';
      if (type === 'fact') {
        val = math.factorial(probN);
        label = `${probN}!`;
      } else if (type === 'nPr') {
        val = math.permutations(probN, probR);
        label = `P(${probN}, ${probR})`;
      } else if (type === 'nCr') {
        val = math.combinations(probN, probR);
        label = `C(${probN}, ${probR})`;
      }
      setProbResult({ label, val });
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleStats = () => {
    setError(null);
    try {
      const data = statsData.split(',').map(n => parseFloat(n.trim())).filter(n => !isNaN(n));
      if (data.length === 0) return;
      setStatsResult({
        mean: statsOperations.mean(data),
        median: statsOperations.median(data),
        mode: statsOperations.mode(data),
        variance: statsOperations.variance(data),
        stdDev: statsOperations.stdDev(data)
      });
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Converter State
  const [convVal, setConvVal] = useState(1);
  const [convCategory, setConvCategory] = useState('Length');
  const [convFrom, setConvFrom] = useState('m');
  const [convTo, setConvTo] = useState('km');
  const [convResult, setConvResult] = useState<any>(null);

  const categories = {
    'Length': ['m', 'km', 'cm', 'mm', 'inch', 'ft', 'yd', 'mi'],
    'Weight': ['kg', 'g', 'mg', 'lb', 'oz'],
    'Temperature': ['celsius', 'fahrenheit', 'kelvin'],
    'Number Systems': ['dec', 'bin', 'hex', 'oct', 'gray'],
    'Data Units': ['bits', 'bytes', 'kb', 'mb', 'gb', 'tb'],
    'Angle': ['deg', 'rad', 'grad']
  };

  useEffect(() => {
    const res = engineeringConverter.convert(convVal, convFrom, convTo, convCategory);
    setConvResult(res);
  }, [convVal, convFrom, convTo, convCategory]);

  // Sync units when category changes
  useEffect(() => {
    const units = categories[convCategory as keyof typeof categories];
    if (units) {
      setConvFrom(units[0]);
      setConvTo(units[1] || units[0]);
    }
  }, [convCategory]);

  // Graph State
  const [graphExpr, setGraphExpr] = useState('x^2');
  const [graphData, setGraphData] = useState<any[]>([]);

  const plotGraph = useCallback(() => {
    const data = [];
    for (let x = -10; x <= 10; x += 0.5) {
      try {
        const y = math.evaluate(graphExpr, { x });
        data.push({ x, y });
      } catch { /* skip invalid points */ }
    }
    setGraphData(data);
  }, [graphExpr]);

  useEffect(() => {
    plotGraph();
  }, [plotGraph]);

  // Calculator Logic
  const handleInput = useCallback((val: string) => {
    setError(null);
    setIsShifted(false); // Auto-reset SHIFT on any input
    setIsOptnMode(false); // Auto-reset OPTN on any input
    
    if (val === 'C') {
      setExpression('');
      setResult('');
    } else if (val === 'DEL') {
      setExpression(prev => prev.slice(0, -1));
    } else if (val === '=') {
      setExpression(currentExpr => {
        if (!currentExpr) return currentExpr;
        
        // Map symbols for evaluation
        let evalExpr = currentExpr
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/−/g, '-');
        
        const res = evaluateExpression(evalExpr, isDegree);
        if (res === 'Syntax Error' || res.startsWith('Unknown')) {
          setError(res);
        } else {
          setResult(res);
          const newItem: HistoryItem = {
            id: Date.now().toString(),
            expression: currentExpr,
            result: res,
            timestamp: Date.now()
          };
          setHistory(prev => [newItem, ...prev].slice(0, 50));
        }
        return currentExpr;
      });
    } else {
      setExpression(prev => {
        const lastChar = prev.slice(-1);
        const operators = ['+', '−', '×', '÷', '^', '%'];
        
        // Prevent multiple operators in a row
        if (operators.includes(val) && operators.includes(lastChar)) {
          // Allow minus after other operators for negative numbers, but not after another minus or open bracket
          if (val === '−' && lastChar !== '−' && lastChar !== '(') {
            return prev + val;
          }
          // Replace last operator if it's not a bracket
          if (lastChar !== '(') {
            return prev.slice(0, -1) + val;
          }
        }
        
        // Prevent multiple decimals in one number
        if (val === '.') {
          const parts = prev.split(/[+−×÷^%(),]/);
          const lastPart = parts[parts.length - 1];
          if (lastPart.includes('.')) return prev;
        }

        return prev + val;
      });
    }
  }, [isDegree]);

  const toggleShift = () => {
    setIsShifted(prev => !prev);
  };

  const toggleCmplx = () => {
    setIsCmplxMode(prev => !prev);
  };

  const toggleOptn = () => {
    setIsOptnMode(prev => !prev);
  };

  const handleShiftableInput = (defaultVal: string, shiftedVal: string) => {
    if (isShifted) {
      handleInput(shiftedVal);
    } else {
      handleInput(defaultVal);
    }
  };

  // Keyboard Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard input if we are in Basic or Scientific mode
      if (mode !== 'Basic' && mode !== 'Scientific') return;
      
      // Don't capture keyboard if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const key = e.key;
      
      if (/[0-9]/.test(key)) {
        handleInput(key);
      } else if (key === '+') {
        handleInput('+');
      } else if (key === '-') {
        handleInput('−');
      } else if (key === '*') {
        handleInput('×');
      } else if (key === '/') {
        handleInput('÷');
      } else if (key === '.') {
        handleInput('.');
      } else if (key === '(' || key === ')' || key === ',') {
        handleInput(key);
      } else if (key === 'i' || key === 'I') {
        handleInput('i');
      } else if (key === 'Enter') {
        e.preventDefault();
        handleInput('=');
      } else if (key === 'Backspace') {
        handleInput('DEL');
      } else if (key === 'Escape') {
        handleInput('C');
      } else if (key === '^') {
        handleInput('^');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, handleInput]);

  // --- Normal Mode AI Handler (Enhanced) ---
  const normalModeResponse = useCallback((input: string, hasImages: boolean): string => {
    // Image guard
    if (hasImages) {
      return '🖼️ Image analysis requires API Mode. Tap ✦ to switch to API Mode and enter your Gemini key.';
    }

    const clean = input.trim();
    if (!clean) return '';

    // Strip natural-language wrappers
    const unwrapped = clean
      .replace(/^(what is|what's|calculate|compute|solve|evaluate|find|give me|tell me|show me)\s+/i, '')
      .trim();

    // Normalize symbols
    const normalized = unwrapped
      .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
      .replace(/\bpi\b/gi, 'pi').replace(/\bπ\b/g, 'pi')
      .replace(/\be\b/g, 'e');

    // --- Linear equation solver: ax + b = c  or  ax = b (single variable x) ---
    const eqMatch = normalized.match(/^([\d.\-+*/^()e pi\s]*)?x\s*([+\-][\d.\s]+)?\s*=\s*([\d.\-+*/^()\s]+)$/i);
    if (eqMatch) {
      try {
        // Use mathjs to solve: parse lhs - rhs = 0
        const lhs = normalized.split('=')[0].trim();
        const rhs = normalized.split('=')[1].trim();
        // Build f(x) = lhs - rhs and solve numerically
        const f = (x: number) => (math.evaluate(lhs, { x }) as number) - (math.evaluate(rhs, { x }) as number);
        // Bisection method (works for linear)
        let lo = -1e9, hi = 1e9;
        let flo = f(lo), fhi = f(hi);
        if (Math.abs(flo) < 1e-12) return `x = ${lo}`;
        if (Math.abs(fhi) < 1e-12) return `x = ${hi}`;
        if (flo * fhi > 0) {
          // Try direct subtract for ax+b=c form
          throw new Error('not linear');
        }
        for (let i = 0; i < 80; i++) {
          const mid = (lo + hi) / 2;
          const fmid = f(mid);
          if (Math.abs(fmid) < 1e-12) { lo = hi = mid; break; }
          if (flo * fmid < 0) { hi = mid; fhi = fmid; }
          else { lo = mid; flo = fmid; }
        }
        const sol = (lo + hi) / 2;
        return `x = ${math.format(sol, { precision: 8 })}`;
      } catch { /* fall through */ }
    }

    // --- Handle trig without parentheses: sin 90, cos 45, tan 60 ---
    const trigMatch = normalized.match(/^(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|log|ln|sqrt|abs|cbrt)\s+([\d.]+)$/i);
    if (trigMatch) {
      try {
        const fn = trigMatch[1].toLowerCase();
        const arg = parseFloat(trigMatch[2]);
        // For trig functions, treat number as degrees if in degree mode
        const evalStr = fn === 'log' ? `log10(${arg})` :
                        fn === 'ln' ? `log(${arg})` :
                        ['sin','cos','tan'].includes(fn) ? `${fn}(${arg} deg)` :
                        `${fn}(${arg})`;
        const res = math.evaluate(evalStr);
        return math.format(res, { precision: 10 });
      } catch { /* fall through */ }
    }

    // --- Direct math evaluation ---
    try {
      const res = math.evaluate(normalized);
      if (res !== undefined && res !== null) {
        return math.format(res, { precision: 10 });
      }
    } catch { /* not evaluatable */ }

    // --- Constants ---
    if (/^pi$/i.test(normalized.trim())) return math.format(Math.PI, { precision: 15 });
    if (/^e$/i.test(normalized.trim())) return math.format(Math.E, { precision: 15 });

    // --- Fallback for non-math queries ---
    if (/\b(explain|why|how does|what is the theory|tell me about|describe|history|define|meaning|concept)\b/i.test(clean)) {
      return '💡 Switch to API Mode for better results on complex questions like this.';
    }

    return '❓ Invalid expression. Try a math expression like "sin 45", "3x+5=11", or "sqrt(144)". Or switch to API Mode for general questions.';
  }, []);

  // --- Voice Input ---
  const handleVoiceInput = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Please use Chrome.');
      return;
    }
    if (isListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAiInput(prev => prev ? `${prev} ${transcript}` : transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  }, [isListening]);

  // --- Copy Message ---
  const handleCopyMessage = useCallback((id: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    });
  }, []);

  // --- Clear Chat ---
  const handleClearChat = useCallback(() => {
    setChatSessions(prev => prev.map(s =>
      s.id === activeSessionId
        ? { ...s, messages: [{ id: '1', role: 'ai', content: 'Calcify AI Assistant. Ready for calculations.', timestamp: Date.now() }] }
        : s
    ));
  }, [activeSessionId]);

  // --- Main AI Send Handler ---
  const handleAiSend = async () => {
    if (!aiInput.trim() && pendingFiles.length === 0) return;

    const currentInput = aiInput;
    const currentFiles = [...pendingFiles];
    setAiInput('');
    setPendingFiles([]);
    setIsAiLoading(true);

    const fileData = await Promise.all(currentFiles.map(file => new Promise<{ name: string, type: string, url: string }>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve({ name: file.name, type: file.type, url: e.target?.result as string });
      reader.readAsDataURL(file);
    })));

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
      timestamp: Date.now(),
      files: fileData
    };

    setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, userMsg] } : s));

    if (messages.length === 1) {
      setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: currentInput.slice(0, 30) || 'New Chat' } : s));
    }

    try {
      let response = '';

      const hasImages = fileData.some(f => f.type.startsWith('image/'));

      if (aiMode === 'normal') {
        // Slight delay to feel natural
        await new Promise(r => setTimeout(r, 300));
        response = normalModeResponse(currentInput, hasImages);
      } else {
        // Offline guard
        if (!isOnline) {
          response = '📡 API Mode requires an internet connection. You appear to be offline.';
          setIsAiLoading(false);
          const offlineMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: response, timestamp: Date.now() };
          setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, offlineMsg] } : s));
          return;
        }
        // API Mode — use user-provided key or fall back to env
        const key = apiKey.trim() || import.meta.env.VITE_GEMINI_API_KEY || '';
        if (!key) {
          response = '🔑 Enter your Gemini API key — click the ✦ button in the input bar.';
        } else {
          const ai = new GoogleGenAI({ apiKey: key });

          const historyContents = messages.map(m => ({
            role: m.role === 'ai' ? 'model' : 'user',
            parts: [{ text: m.content }]
          }));

          const contextPrompt = `[CALCULATOR_STATE]
Expression: ${expression || 'None'}
Result: ${result || 'None'}
[/CALCULATOR_STATE]

User Message: ${currentInput || (currentFiles.length > 0 ? 'Analyze these files.' : 'Solve the current expression.')}`;

          const currentParts: any[] = [{ text: contextPrompt }];
          for (const file of fileData) {
            if (file.url.startsWith('data:')) {
              const [header, data] = file.url.split(',');
              const mimeType = header.split(':')[1].split(';')[0];
              currentParts.push({ inlineData: { mimeType, data } });
            }
          }

          const result_ai = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-04-17',
            contents: [...historyContents, { role: 'user', parts: currentParts }],
            config: {
              systemInstruction: `You are Calcify AI, a high-precision calculator assistant.
STRICT RESPONSE RULES:
1. SIMPLE ARITHMETIC: Return ONLY the numeric result. No greetings.
2. COMPLEX MATH: Minimal clean step-by-step. Use math notation.
3. EXPLANATIONS: Only if user asks "explain" or "show steps".
4. NO FILLER: No "Sure", "I can help", "Hope this helps" etc.
5. VARIABLES: Support variable assignment across conversation history.
6. SCIENTIFIC FUNCTIONS: Support all standard functions.
7. FORMATTING: Short, direct, copy-friendly output.
CONTEXT: You can see the user's calculator state in [CALCULATOR_STATE] tags.`
            }
          });
          response = result_ai.text || 'Error: Could not generate response.';
        }
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response,
        timestamp: Date.now()
      };
      setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, aiMsg] } : s));
    } catch (err: any) {
      console.error('AI Error:', err);
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: `⚠️ Error: ${err?.message || 'Something went wrong. Please check your API key and try again.'}`,
        timestamp: Date.now()
      };
      setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, errMsg] } : s));
    } finally {
      setIsAiLoading(false);
    }
  };

  const createNewChat = () => {
    const newId = Date.now().toString();
    setChatSessions(prev => [{
      id: newId,
      title: 'New Chat',
      messages: [{ id: '1', role: 'ai', content: 'Calcify AI Assistant. Ready for calculations.', timestamp: Date.now() }],
      timestamp: Date.now()
    }, ...prev]);
    setActiveSessionId(newId);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraOpen(true);
      }
    } catch (err) {
      setError("Could not access camera. Please check permissions.");
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setPendingFiles(prev => [...prev, file]);
          stopCamera();
        }
      }, 'image/jpeg');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-200 global-grid-bg relative overflow-x-hidden">
      
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-[var(--card-border)] bg-[var(--bg)]/40 backdrop-blur-md shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 -ml-2 rounded-xl hover:bg-[var(--muted)] transition-all text-[var(--muted-foreground)] hover:text-[var(--text)]"
            >
              <Menu size={24} />
            </button>
            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[var(--accent)]/20 to-blue-500/10 backdrop-blur-xl border border-[var(--accent)]/30 shadow-[0_8px_32px_0_rgba(30,64,175,0.2)] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
              <CalcIcon className="text-[var(--accent)] relative z-10" size={20} />
            </div>
            <h1 className="text-2xl font-display font-extrabold tracking-tighter bg-gradient-to-r from-[var(--text)] to-[var(--muted-foreground)] bg-clip-text text-transparent">Calcify</h1>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            {(['Basic', 'Scientific', 'Matrix', 'Statistics', 'Converter', 'Graph', 'AI Assistant'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 group",
                  mode === m 
                    ? "text-[var(--text)]" 
                    : "text-[var(--muted-foreground)] hover:text-[var(--text)]"
                )}
              >
                {mode === m && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/10 to-blue-400/10 rounded-full z-0"
                    initial={false}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {m === 'AI Assistant' && <Bot size={16} />}
                  {m}
                </span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Install App Button */}
            {showInstallBanner && (
              <button
                onClick={handleInstallApp}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)] hover:text-white transition-all duration-300"
                title="Install Calcify App"
              >
                <Download size={13} /> Install
              </button>
            )}
            {/* Offline indicator */}
            {!isOnline && (
              <span className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20">
                <WifiOff size={11} /> Offline
              </span>
            )}
            <button 
              onClick={() => setIsContactModalOpen(true)}
              className="p-2.5 rounded-full hover:bg-[var(--muted)] transition-all duration-300 text-[var(--muted-foreground)] hover:text-[var(--text)] border border-transparent hover:border-[var(--card-border)]"
              title="Feedback"
            >
              <MessageSquare size={20} />
            </button>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-full hover:bg-[var(--muted)] transition-all duration-300 text-[var(--muted-foreground)] hover:text-[var(--text)] border border-transparent hover:border-[var(--card-border)]"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-[var(--card-border)] bg-[var(--card-bg)]/95 backdrop-blur-xl overflow-hidden"
            >
              <div className="p-4 flex flex-col gap-2">
                {(['Basic', 'Scientific', 'Matrix', 'Statistics', 'Converter', 'Graph', 'AI Assistant'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMode(m);
                      setIsMenuOpen(false);
                    }}
                    className={cn(
                      "w-full px-5 py-4 rounded-2xl text-base font-semibold transition-all duration-300 flex items-center gap-3",
                      mode === m 
                        ? "bg-gradient-to-r from-[var(--accent)]/10 to-blue-400/10 text-[var(--text)] border border-[var(--accent)]/20" 
                        : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--text)]"
                    )}
                  >
                    {m === 'AI Assistant' ? <Bot size={20} /> : <CalcIcon size={20} />}
                    {m}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className={cn("max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-20", mode === 'AI Assistant' && "max-w-full px-0 py-0 h-[calc(100dvh-80px)]")}
        style={mode === 'AI Assistant' ? { WebkitOverflowScrolling: 'touch' } : undefined}
      >
        {mode === 'AI Assistant' ? (
          <div className="flex flex-col md:flex-row h-full overflow-hidden bg-[var(--bg)] md:rounded-[2rem] border-y md:border border-[var(--card-border)] shadow-2xl">
            {/* AI Sidebar — Desktop only */}
            <div className="hidden md:flex w-72 shrink-0 flex-col border-r border-[var(--card-border)] bg-[var(--card-bg)]/50 backdrop-blur-xl">
              <div className="p-5 border-b border-[var(--card-border)] space-y-2">
                <Button onClick={createNewChat} variant="primary" className="w-full justify-center gap-2 text-sm shadow-md">
                  <Plus size={16} /> New Chat
                </Button>
                <Button onClick={handleClearChat} variant="danger" className="w-full justify-center gap-2 text-sm">
                  <Trash2 size={14} /> Clear Chat
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-hide">
                {chatSessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-200 truncate font-medium",
                      activeSessionId === session.id
                        ? "bg-gradient-to-r from-[var(--accent)]/10 to-blue-400/10 text-[var(--text)] border border-[var(--accent)]/20 shadow-sm"
                        : "hover:bg-[var(--muted)] text-[var(--muted-foreground)] border border-transparent"
                    )}
                  >
                    {session.title}
                  </button>
                ))}
              </div>
              <div className="p-5 border-t border-[var(--card-border)] space-y-2.5">
                <div className={cn(
                  "text-[10px] font-bold uppercase tracking-widest text-center px-3 py-1.5 rounded-xl border",
                  aiMode === 'api'
                    ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
                    : "text-[var(--muted-foreground)] bg-[var(--muted)] border-[var(--card-border)]"
                )}>
                  {aiMode === 'api' ? '⚡ API Mode Active' : '🧮 Normal Mode'}
                </div>
                <Button onClick={() => setMode('Scientific')} variant="secondary" className="w-full justify-center gap-2 text-sm">
                  <CalcIcon size={16} /> Back to Calculator
                </Button>
              </div>
            </div>

            {/* Mobile top bar for AI (chat session title + actions) */}
            <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)] bg-[var(--card-bg)]/60 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg border',
                  aiMode === 'api' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' : 'text-[var(--muted-foreground)] bg-[var(--muted)] border-[var(--card-border)]'
                )}>
                  {aiMode === 'api' ? '⚡ API' : '🧮 Normal'}
                </div>
                <span className="text-xs font-semibold truncate max-w-[140px] opacity-70">{activeSession.title}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={createNewChat} className="p-2 rounded-xl hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors" title="New Chat"><Plus size={16} /></button>
                <button onClick={handleClearChat} className="p-2 rounded-xl hover:bg-[var(--muted)] text-rose-400 transition-colors" title="Clear Chat"><Trash2 size={16} /></button>
                <button onClick={() => setMode('Scientific')} className="p-2 rounded-xl hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors" title="Back to Calculator"><CalcIcon size={16} /></button>
              </div>
            </div>

            {/* AI Chat Area */}
            <div className="flex-1 flex flex-col bg-[var(--bg)] relative min-w-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 scrollbar-hide overscroll-contain">
                <div className="max-w-3xl mx-auto space-y-6">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 14, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                      className={cn('flex gap-4 group', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm',
                        msg.role === 'user'
                          ? 'bg-[var(--muted)] border border-[var(--card-border)]'
                          : 'bg-gradient-to-br from-[var(--accent)] to-blue-400 text-white shadow-md shadow-[var(--accent)]/20'
                      )}>
                        {msg.role === 'user' ? <UserIcon size={18} /> : <Bot size={18} />}
                      </div>
                      <div className={cn('flex flex-col gap-1.5 max-w-[85%]', msg.role === 'user' ? 'items-end' : 'items-start')}>
                        <div className={cn(
                          'p-5 rounded-3xl text-sm leading-relaxed shadow-sm transition-shadow duration-300',
                          msg.role === 'user'
                            ? 'bg-[var(--accent)] text-white rounded-tr-sm shadow-[0_4px_14px_0_rgba(30,64,175,0.2)]'
                            : 'bg-[var(--card-bg)] border border-[var(--card-border)] rounded-tl-sm backdrop-blur-md hover:shadow-[0_4px_20px_-5px_rgba(30,64,175,0.12)] hover:border-[var(--accent)]/20'
                        )}>
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          {msg.files && msg.files.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-3">
                              {msg.files.map((file, i) => (
                                <div key={i} className="rounded-xl overflow-hidden border border-[var(--card-border)] bg-[var(--muted)] shadow-sm">
                                  {file.type.startsWith('image/') ? (
                                    <img src={file.url} alt={file.name} className="max-w-[240px] max-h-[240px] object-cover" />
                                  ) : (
                                    <div className="p-3 flex items-center gap-2 text-xs font-medium">
                                      <FileIcon size={16} className="text-[var(--accent)]" /> {file.name}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className={cn('flex items-center gap-2 px-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                          <span className="text-[11px] font-medium opacity-40">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.role === 'ai' && (
                            <button
                              onClick={() => handleCopyMessage(msg.id, msg.content)}
                              className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--text)]"
                              title="Copy response"
                            >
                              {copiedMsgId === msg.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {isAiLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                      className="flex gap-4"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-blue-400 flex items-center justify-center text-white shrink-0 shadow-sm shadow-[var(--accent)]/20">
                        <Bot size={18} />
                      </div>
                      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-5 rounded-3xl rounded-tl-sm backdrop-blur-md shadow-sm flex items-center gap-3">
                        <div className="flex gap-1.5 items-center">
                          <div className="w-2 h-2 rounded-full bg-[var(--accent)]/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-[var(--accent)]/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-[var(--accent)]/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs font-medium opacity-50">AI is thinking...</span>
                      </div>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* AI Input Area */}
              <div className="p-4 md:p-6 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent">
                <div className="max-w-3xl mx-auto space-y-3">

                  {/* API Mode Panel */}
                  <AnimatePresence>
                    {isApiPanelOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--accent)]/20 shadow-sm space-y-3">
                          <div className="flex items-center gap-2">
                            <KeyRound size={14} className="text-[var(--accent)]" />
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Gemini API Key</span>
                          </div>
                          <div className="relative">
                            <input
                              type={isApiKeyVisible ? 'text' : 'password'}
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                              placeholder="Paste your Gemini API key here..."
                              className="w-full bg-[var(--muted)] border border-[var(--card-border)] rounded-xl px-4 py-2.5 pr-12 text-sm font-mono outline-none focus:ring-2 ring-[var(--accent)]/20 transition-all"
                            />
                            <button
                              onClick={() => setIsApiKeyVisible(p => !p)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--text)] transition-colors"
                            >
                              {isApiKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          <p className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1.5">
                            <Check size={11} className="text-emerald-500 shrink-0" />
                            Your API key is only used for this session and is never stored.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Pending Files Preview */}
                  {pendingFiles.length > 0 && (
                    <div className="flex flex-wrap gap-3 p-3 bg-[var(--card-bg)]/90 backdrop-blur-xl rounded-2xl border border-[var(--card-border)] shadow-lg">
                      {pendingFiles.map((file, i) => (
                        <div key={i} className="relative group">
                          <div className="w-16 h-16 rounded-xl bg-[var(--muted)] border border-[var(--card-border)] overflow-hidden flex items-center justify-center shadow-sm">
                            {file.type.startsWith('image/') ? (
                              <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                            ) : (
                              <FileIcon size={20} className="opacity-40" />
                            )}
                          </div>
                          <button
                            onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input Row */}
                  <div className="relative flex items-end gap-2 bg-[var(--card-bg)]/80 backdrop-blur-xl border border-[var(--card-border)] rounded-[2rem] p-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] focus-within:ring-2 ring-[var(--accent)]/20 transition-all duration-300">
                    <div className="flex gap-0.5 p-1.5">
                      {/* API Mode Toggle */}
                      <button
                        onClick={() => {
                          const next = aiMode === 'normal' ? 'api' : 'normal';
                          setAiMode(next);
                          setIsApiPanelOpen(next === 'api');
                        }}
                        title={aiMode === 'api' ? 'Switch to Normal Mode' : 'Switch to API Mode'}
                        className={cn(
                          'p-2 rounded-xl transition-all duration-300 text-xs font-bold',
                          aiMode === 'api'
                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                            : 'hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--text)]'
                        )}
                      >
                        <Sparkles size={18} />
                      </button>
                      <label className="p-2 rounded-xl hover:bg-[var(--muted)] cursor-pointer transition-all duration-300 text-[var(--muted-foreground)] hover:text-[var(--text)]">
                        <Paperclip size={18} />
                        <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                      </label>
                      <button
                        onClick={startCamera}
                        className="p-2 rounded-xl hover:bg-[var(--muted)] transition-all duration-300 text-[var(--muted-foreground)] hover:text-[var(--text)]"
                      >
                        <Camera size={18} />
                      </button>
                      {/* Microphone */}
                      <button
                        onClick={handleVoiceInput}
                        title="Voice Input"
                        className={cn(
                          'p-2 rounded-xl transition-all duration-300',
                          isListening
                            ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse'
                            : 'hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--text)]'
                        )}
                      >
                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                      </button>
                    </div>
                    <textarea
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAiSend();
                        }
                      }}
                      placeholder={aiMode === 'api' ? 'Ask anything — API Mode active...' : 'Message Calcify Assistant...'}
                      className="flex-1 bg-transparent border-none py-4 px-2 text-sm outline-none resize-none max-h-32 scrollbar-hide placeholder:text-[var(--muted-foreground)]/60 font-medium"
                      rows={1}
                    />
                    <button
                      onClick={handleAiSend}
                      disabled={isAiLoading || (!aiInput.trim() && pendingFiles.length === 0)}
                      className="p-3.5 m-1 bg-[var(--accent)] text-white rounded-2xl disabled:opacity-50 shadow-[0_4px_14px_0_rgba(30,64,175,0.39)] dark:shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] transition-all duration-300 active:scale-95 hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    >
                      <SendHorizontal size={20} />
                    </button>
                  </div>
                  <p className="text-[11px] text-center font-medium opacity-30">
                    {aiMode === 'api' ? '⚡ Gemini 2.5 Flash · API Mode' : '🧮 Normal Mode · Tap ✦ to enable API Mode'}
                  </p>
                </div>
              </div>
            </div>

            {/* Camera Overlay */}
            <AnimatePresence>
              {isCameraOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4"
                >
                  <div className="relative w-full max-w-2xl aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                      <button onClick={stopCamera} className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all">
                        <X size={24} />
                      </button>
                      <button onClick={captureImage} className="p-6 bg-white rounded-full shadow-xl active:scale-90 transition-all">
                        <div className="w-4 h-4 rounded-full border-2 border-zinc-900" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Workspace */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Display Panel */}
            <div className="p-8 rounded-[2rem] bg-[var(--card-bg)] border border-[var(--card-border)] shadow-[0_10px_30px_-4px_rgba(0,0,0,0.04)] dark:shadow-[0_15px_35px_-5px_rgba(0,0,0,0.3)] backdrop-blur-xl text-right relative overflow-hidden transition-all duration-300">
              <div className="absolute top-6 left-8 flex gap-3">
                <button onClick={() => setIsDegree(!isDegree)} className="text-xs font-bold tracking-widest text-[var(--muted-foreground)] hover:text-[var(--text)] transition-colors bg-[var(--muted)] px-3 py-1.5 rounded-lg border border-[var(--card-border)]">
                  {isDegree ? 'DEG' : 'RAD'}
                </button>
                {isCmplxMode && <span className="text-xs font-bold tracking-widest text-purple-500 border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 rounded-lg">CMPLX</span>}
              </div>
              <div className="flex justify-end items-center mb-6 h-6">
                {error && <div className="text-rose-500 text-sm font-medium flex items-center gap-1.5 bg-rose-500/10 px-3 py-1 rounded-lg"><AlertCircle size={16} /> {error}</div>}
              </div>
              <div className="h-10 text-xl font-mono text-[var(--muted-foreground)] overflow-x-auto whitespace-nowrap scrollbar-hide tracking-tight">{expression || '0'}</div>
              <div className="text-6xl md:text-7xl font-bold truncate py-2 tracking-tighter bg-gradient-to-br from-[var(--text)] to-[var(--muted-foreground)] bg-clip-text text-transparent">{result || '0'}</div>
            </div>

            {/* Mode Panels */}
            <AnimatePresence mode="wait">
              {mode === 'Basic' && (
                <motion.div 
                  key="basic" 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }} 
                  className="grid grid-cols-4 gap-3 max-w-md mx-auto p-4 rounded-3xl bg-[var(--muted)]/30 border border-[var(--card-border)] shadow-inner"
                >
                  {/* Row 1 */}
                  <Button onClick={() => handleInput('C')} variant="danger" className="h-16 text-2xl">C</Button>
                  <Button onClick={() => handleInput('(')} variant="secondary" className="h-16 text-2xl font-mono">(</Button>
                  <Button onClick={() => handleInput(')')} variant="secondary" className="h-16 text-2xl font-mono">)</Button>
                  <Button onClick={() => handleInput('÷')} variant="secondary" className="h-16 text-4xl text-[var(--accent)]">÷</Button>
                  
                  {/* Row 2 */}
                  <Button onClick={() => handleInput('7')} variant="ghost" className="h-16 text-3xl">7</Button>
                  <Button onClick={() => handleInput('8')} variant="ghost" className="h-16 text-3xl">8</Button>
                  <Button onClick={() => handleInput('9')} variant="ghost" className="h-16 text-3xl">9</Button>
                  <Button onClick={() => handleInput('×')} variant="secondary" className="h-16 text-4xl text-[var(--accent)]">×</Button>
                  
                  {/* Row 3 */}
                  <Button onClick={() => handleInput('4')} variant="ghost" className="h-16 text-3xl">4</Button>
                  <Button onClick={() => handleInput('5')} variant="ghost" className="h-16 text-3xl">5</Button>
                  <Button onClick={() => handleInput('6')} variant="ghost" className="h-16 text-3xl">6</Button>
                  <Button onClick={() => handleInput('−')} variant="secondary" className="h-16 text-4xl text-[var(--accent)]">−</Button>
                  
                  {/* Row 4 */}
                  <Button onClick={() => handleInput('1')} variant="ghost" className="h-16 text-3xl">1</Button>
                  <Button onClick={() => handleInput('2')} variant="ghost" className="h-16 text-3xl">2</Button>
                  <Button onClick={() => handleInput('3')} variant="ghost" className="h-16 text-3xl">3</Button>
                  <Button onClick={() => handleInput('+')} variant="secondary" className="h-16 text-4xl text-[var(--accent)]">+</Button>
                  
                  {/* Row 5 */}
                  <Button onClick={() => handleInput('0')} variant="ghost" className="h-16 text-3xl">0</Button>
                  <Button onClick={() => handleInput('.')} variant="ghost" className="h-16 text-3xl">.</Button>
                  <Button onClick={() => handleInput('DEL')} variant="danger" className="h-16 text-sm">DEL</Button>
                  <Button onClick={() => handleInput('=')} variant="primary" className="h-16 text-4xl">=</Button>
                </motion.div>
              )}

              {mode === 'Scientific' && (
                <motion.div 
                  key="sci" 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }} 
                  className="grid grid-cols-6 gap-2 sm:gap-3 max-w-3xl mx-auto p-4 rounded-3xl bg-[var(--muted)]/30 border border-[var(--card-border)] shadow-inner"
                >
                  {/* Row 1 */}
                  <Button onClick={toggleShift} variant="secondary" size="sm" className={cn("h-12 sm:h-14 text-xs font-mono border transition-colors", isShifted ? "border-yellow-500 text-yellow-500 bg-yellow-500/10 active" : "border-transparent text-yellow-600")}>SHIFT</Button>
                  <Button onClick={toggleOptn} variant="secondary" size="sm" className={cn("h-12 sm:h-14 text-xs font-mono border transition-colors", isOptnMode ? "border-blue-500 text-blue-500 bg-blue-500/10 active" : "border-transparent text-blue-600")}>OPTN</Button>
                  <Button onClick={toggleCmplx} variant="secondary" size="sm" className={cn("h-12 sm:h-14 text-xs font-mono border transition-colors", isCmplxMode ? "border-purple-500 text-purple-500 bg-purple-500/10 active" : "border-transparent text-purple-600")}>CMPLX</Button>
                  <Button onClick={() => handleInput('DEL')} variant="danger" className="h-12 sm:h-14 text-xs">DEL</Button>
                  <Button onClick={() => handleInput('C')} variant="danger" className="h-12 sm:h-14 text-xl col-span-2">AC</Button>

                  {/* Row 2 */}
                  <Button onClick={() => handleShiftableInput('sin(', 'asin(')} data-val={isShifted ? "sin⁻¹(" : "sin("} variant="secondary" size="sm" className="h-12 sm:h-14 text-xs font-mono">{isShifted ? 'sin⁻¹' : 'sin'}</Button>
                  <Button onClick={() => handleShiftableInput('cos(', 'acos(')} data-val={isShifted ? "cos⁻¹(" : "cos("} variant="secondary" size="sm" className="h-12 sm:h-14 text-xs font-mono">{isShifted ? 'cos⁻¹' : 'cos'}</Button>
                  <Button onClick={() => handleShiftableInput('tan(', 'atan(')} data-val={isShifted ? "tan⁻¹(" : "tan("} variant="secondary" size="sm" className="h-12 sm:h-14 text-xs font-mono">{isShifted ? 'tan⁻¹' : 'tan'}</Button>
                  <Button onClick={() => handleShiftableInput('log(', '10^')} data-val={isShifted ? "10^" : "log("} variant="secondary" size="sm" className="h-12 sm:h-14 text-xs font-mono">{isShifted ? '10ˣ' : 'log'}</Button>
                  <Button onClick={() => handleShiftableInput('ln(', 'exp(')} data-val={isShifted ? "exp(" : "ln("} variant="secondary" size="sm" className="h-12 sm:h-14 text-xs font-mono">{isShifted ? 'eˣ' : 'ln'}</Button>
                  <Button onClick={() => handleInput('^')} variant="secondary" size="sm" className="h-12 sm:h-14 text-xs font-mono">xʸ</Button>

                  {/* Row 3 */}
                  <Button onClick={() => handleInput('^2')} variant="secondary" size="sm" className="h-12 sm:h-14 text-xs font-mono">x²</Button>
                  <Button onClick={() => handleInput('^3')} variant="secondary" size="sm" className="h-12 sm:h-14 text-xs font-mono">x³</Button>
                  <Button onClick={() => isOptnMode ? handleInput('c') : handleInput('7')} variant="ghost" className="h-12 sm:h-14 text-2xl">{isOptnMode ? 'c' : '7'}</Button>
                  <Button onClick={() => isOptnMode ? handleInput('h') : handleInput('8')} variant="ghost" className="h-12 sm:h-14 text-2xl">{isOptnMode ? 'h' : '8'}</Button>
                  <Button onClick={() => isOptnMode ? handleInput('ε₀') : handleInput('9')} variant="ghost" className="h-12 sm:h-14 text-2xl">{isOptnMode ? 'ε₀' : '9'}</Button>
                  <Button onClick={() => handleInput('÷')} variant="secondary" className="h-12 sm:h-14 text-2xl text-[var(--accent)]">÷</Button>

                  {/* Row 4 */}
                  <Button onClick={() => handleInput('sqrt(')} variant="secondary" size="sm" className="h-12 sm:h-14 text-xs font-mono">√</Button>
                  <Button onClick={() => handleInput('cbrt(')} variant="secondary" size="sm" className="h-12 sm:h-14 text-xs font-mono">∛</Button>
                  <Button onClick={() => handleInput('4')} variant="ghost" className="h-12 sm:h-14 text-2xl">4</Button>
                  <Button onClick={() => handleInput('5')} variant="ghost" className="h-12 sm:h-14 text-2xl">5</Button>
                  <Button onClick={() => handleInput('6')} variant="ghost" className="h-12 sm:h-14 text-2xl">6</Button>
                  <Button onClick={() => handleInput('×')} variant="secondary" className="h-12 sm:h-14 text-3xl text-[var(--accent)]">×</Button>

                  {/* Row 5 */}
                  <Button onClick={() => handleInput('(')} variant="secondary" size="sm" className="h-12 sm:h-14 text-xs font-mono">(</Button>
                  <Button onClick={() => handleInput(')')} variant="secondary" size="sm" className="h-12 sm:h-14 text-xs font-mono">)</Button>
                  <Button onClick={() => handleInput('1')} variant="ghost" className="h-12 sm:h-14 text-2xl">1</Button>
                  <Button onClick={() => handleInput('2')} variant="ghost" className="h-12 sm:h-14 text-2xl">2</Button>
                  <Button onClick={() => handleInput('3')} variant="ghost" className="h-12 sm:h-14 text-2xl">3</Button>
                  <Button onClick={() => handleShiftableInput('−', 'Rec(')} variant="secondary" className="h-12 sm:h-14 text-3xl text-[var(--accent)]">{isShifted ? 'Rec' : '−'}</Button>

                  {/* Row 6 */}
                  <Button onClick={() => handleInput('abs(')} variant="secondary" size="sm" className="h-12 sm:h-14 text-xs font-mono">|x|</Button>
                  <Button onClick={() => handleInput('!')} variant="secondary" size="sm" className="h-12 sm:h-14 text-xs font-mono">n!</Button>
                  <Button onClick={() => handleInput('0')} variant="ghost" className="h-12 sm:h-14 text-2xl">0</Button>
                  <Button onClick={() => handleInput('.')} variant="ghost" className="h-12 sm:h-14 text-2xl">.</Button>
                  <Button onClick={() => isCmplxMode ? handleInput('i') : handleInput(',')} variant="secondary" size="sm" className="h-12 sm:h-14 text-xl font-mono">{isCmplxMode ? 'i' : ','}</Button>
                  <Button onClick={() => handleShiftableInput('+', 'Pol(')} variant="secondary" className="h-12 sm:h-14 text-3xl text-[var(--accent)]">{isShifted ? 'Pol' : '+'}</Button>

                  {/* Row 7 */}
                  <Button onClick={() => handleInput('pi')} variant="secondary" size="sm" className="h-12 sm:h-14 text-xs font-mono">π</Button>
                  <Button onClick={() => handleInput('e')} variant="secondary" size="sm" className="h-12 sm:h-14 text-xs font-mono">e</Button>
                  <Button onClick={() => handleInput('1/')} variant="secondary" size="sm" className="h-12 sm:h-14 text-xs font-mono">1/x</Button>
                  <Button onClick={() => isCmplxMode ? handleInput('∠') : handleInput('ENG')} variant="secondary" size="sm" className="h-12 sm:h-14 text-xs font-mono">{isCmplxMode ? '∠' : 'ENG'}</Button>
                  <Button onClick={() => handleInput('=')} variant="primary" className="h-12 sm:h-14 text-3xl col-span-2">=</Button>
                </motion.div>
              )}

              {mode === 'Matrix' && (
                <motion.div key="matrix" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Matrices</h2>
                    <Button onClick={addMatrix} variant="accent" size="sm" className="gap-2">
                      <Plus size={16} /> Add Matrix
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matrices.map((m) => (
                      <GlassCard 
                        key={m.id} 
                        title={m.name} 
                        icon={Grid3X3}
                        className="relative group"
                      >
                        <button 
                          onClick={() => removeMatrix(m.id)}
                          className="absolute top-3 right-3 p-1.5 rounded-lg bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                          title="Remove Matrix"
                        >
                          <Trash2 size={14} />
                        </button>
                        
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 block mb-1.5 ml-1">Rows</label>
                            <input 
                              type="number" 
                              min="1"
                              max="10"
                              value={m.rows} 
                              onChange={(e) => updateMatrixSize(m.id, parseInt(e.target.value) || 1, m.cols)}
                              className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-3 py-2 text-sm font-medium outline-none focus:ring-2 ring-[var(--accent)]/20 transition-all shadow-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 block mb-1.5 ml-1">Cols</label>
                            <input 
                              type="number" 
                              min="1"
                              max="10"
                              value={m.cols} 
                              onChange={(e) => updateMatrixSize(m.id, m.rows, parseInt(e.target.value) || 1)}
                              className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-3 py-2 text-sm font-medium outline-none focus:ring-2 ring-[var(--accent)]/20 transition-all shadow-sm"
                            />
                          </div>
                        </div>

                        <div className="grid gap-1.5 overflow-x-auto pb-2 scrollbar-hide" style={{ gridTemplateColumns: `repeat(${m.cols}, minmax(40px, 1fr))` }}>
                          {m.data.map((row, r) => row.map((val, c) => (
                            <input
                              key={`${r}-${c}`}
                              type="number"
                              value={val}
                              onChange={(e) => updateMatrixValue(m.id, r, c, parseFloat(e.target.value) || 0)}
                              className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-2 text-center text-sm font-medium outline-none focus:ring-2 ring-[var(--accent)]/20 font-mono shadow-sm transition-all"
                            />
                          )))}
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                  
                  <GlassCard title="Operations" icon={Settings} className="bg-gradient-to-br from-[var(--accent)]/5 to-blue-400/5 border-[var(--accent)]/10">
                    <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-end">
                      <div className="flex items-center gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 ml-1">Matrix 1</label>
                          <select 
                            value={selectedMatrix1} 
                            onChange={(e) => setSelectedMatrix1(e.target.value)}
                            className="w-32 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-3 py-2 text-sm font-medium outline-none focus:ring-2 ring-[var(--accent)]/20 shadow-sm transition-all"
                          >
                            {matrices.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        </div>
                        <div className="pt-6 opacity-40"><ChevronRight size={20} /></div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 ml-1">Matrix 2</label>
                          <select 
                            value={selectedMatrix2} 
                            onChange={(e) => setSelectedMatrix2(e.target.value)}
                            className="w-32 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-3 py-2 text-sm font-medium outline-none focus:ring-2 ring-[var(--accent)]/20 shadow-sm transition-all"
                          >
                            {matrices.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-center lg:justify-start flex-1">
                        <Button onClick={() => handleMatrixOp('add')} variant="secondary" size="sm" className="text-sm px-4">Add (+)</Button>
                        <Button onClick={() => handleMatrixOp('sub')} variant="secondary" size="sm" className="text-sm px-4">Sub (−)</Button>
                        <Button onClick={() => handleMatrixOp('mul')} variant="secondary" size="sm" className="text-sm px-4">Mul (×)</Button>
                        <div className="hidden lg:block w-px h-10 bg-[var(--card-border)] mx-2" />
                        <Button onClick={() => handleMatrixOp('det')} variant="secondary" size="sm" className="text-sm px-4">Det</Button>
                        <Button onClick={() => handleMatrixOp('inv')} variant="secondary" size="sm" className="text-sm px-4">Inv</Button>
                        <Button onClick={() => handleMatrixOp('trans')} variant="secondary" size="sm" className="text-sm px-4">Trans</Button>
                      </div>
                    </div>
                  </GlassCard>

                  {matrixResult !== null && (
                    <GlassCard title={`Result: ${matrixOpLabel}`} icon={Check} className="border-[var(--accent)]/20 bg-gradient-to-br from-[var(--accent)]/5 to-blue-400/5">
                      {typeof matrixResult === 'number' ? (
                        <div className="text-4xl font-bold text-[var(--accent)]">{matrixResult}</div>
                      ) : (
                        <div className="grid gap-1.5 overflow-x-auto pb-2 scrollbar-hide" style={{ gridTemplateColumns: `repeat(${(matrixResult as number[][])[0].length}, minmax(60px, 1fr))` }}>
                          {(matrixResult as number[][]).map((row, r) => row.map((val, c) => (
                            <div key={`${r}-${c}`} className="p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--accent)]/20 text-center font-mono text-[var(--accent)] font-bold text-sm shadow-sm">
                              {math.format(val, { precision: 4 })}
                            </div>
                          )))}
                        </div>
                      )}
                    </GlassCard>
                  )}
                </motion.div>
              )}

              {mode === 'Statistics' && (
                <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard title="Descriptive Statistics" icon={BarChart3}>
                      <p className="text-xs font-medium opacity-60 mb-3 ml-1">Enter numbers separated by commas (e.g., 10, 20, 30)</p>
                      <textarea 
                        value={statsData} 
                        onChange={(e) => setStatsData(e.target.value)}
                        placeholder="10, 20, 30..."
                        className="w-full h-24 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 outline-none focus:ring-2 ring-[var(--accent)]/20 font-mono text-sm shadow-sm transition-all"
                      />
                      <Button onClick={handleStats} variant="primary" className="mt-4 w-full text-sm py-3 shadow-md">Calculate Stats</Button>
                      
                      {statsResult && (
                        <div className="grid grid-cols-2 gap-3 mt-6">
                          {Object.entries(statsResult).map(([key, val]: [string, any]) => (
                            <div key={key} className="p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm">
                              <div className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">{key}</div>
                              <div className="text-base font-bold text-[var(--accent)]">{typeof val === 'number' ? math.format(val, { precision: 4 }) : val}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </GlassCard>

                    <GlassCard title="Probability (nPr, nCr)" icon={Sparkles}>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 ml-1">n (Total)</label>
                          <input 
                            type="number" 
                            value={probN} 
                            onChange={(e) => setProbN(parseInt(e.target.value) || 0)}
                            className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 ring-[var(--accent)]/20 shadow-sm transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 ml-1">r (Selection)</label>
                          <input 
                            type="number" 
                            value={probR} 
                            onChange={(e) => setProbR(parseInt(e.target.value) || 0)}
                            className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 ring-[var(--accent)]/20 shadow-sm transition-all"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Button onClick={() => handleProb('fact')} variant="secondary" size="sm" className="text-xs">n!</Button>
                        <Button onClick={() => handleProb('nPr')} variant="secondary" size="sm" className="text-xs">nPr</Button>
                        <Button onClick={() => handleProb('nCr')} variant="secondary" size="sm" className="text-xs">nCr</Button>
                      </div>

                      {probResult && (
                        <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-[var(--accent)]/5 to-blue-400/5 border border-[var(--accent)]/20 text-center shadow-sm">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] opacity-80 mb-2">{probResult.label}</div>
                          <div className="text-4xl font-bold text-[var(--accent)] tracking-tight">
                            {math.format(probResult.val, { precision: 10 })}
                          </div>
                        </div>
                      )}
                    </GlassCard>
                  </div>
                </motion.div>
              )}

              {mode === 'Converter' && (
                <motion.div key="conv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <GlassCard title="Engineering Unit Converter" icon={ArrowLeftRight}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 ml-1">Category</label>
                        <select 
                          value={convCategory} 
                          onChange={(e) => setConvCategory(e.target.value)} 
                          className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 ring-[var(--accent)]/20 shadow-sm transition-all"
                        >
                          {Object.keys(categories).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 ml-1">Value</label>
                        <input 
                          type={convCategory === 'Number Systems' ? 'text' : 'number'}
                          value={convVal} 
                          onChange={(e) => setConvVal(e.target.value as any)}
                          className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 ring-[var(--accent)]/20 shadow-sm transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 ml-1">From</label>
                        <select 
                          value={convFrom} 
                          onChange={(e) => setConvFrom(e.target.value)} 
                          className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 ring-[var(--accent)]/20 shadow-sm transition-all"
                        >
                          {categories[convCategory as keyof typeof categories]?.map(unit => (
                            <option key={unit} value={unit}>{unit.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 ml-1">To</label>
                        <select 
                          value={convTo} 
                          onChange={(e) => setConvTo(e.target.value)} 
                          className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 ring-[var(--accent)]/20 shadow-sm transition-all"
                        >
                          {categories[convCategory as keyof typeof categories]?.map(unit => (
                            <option key={unit} value={unit}>{unit.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {convResult !== null && (
                      <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-blue-600 text-white text-center shadow-[0_10px_30px_-10px_rgba(30,64,175,0.4)] dark:shadow-[0_10px_30px_-10px_rgba(59,130,246,0.4)]">
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-2">Result</div>
                        <div className="text-4xl font-bold break-all tracking-tight">
                          {typeof convResult === 'number' ? math.format(convResult, { precision: 8 }) : convResult}
                          <span className="text-base ml-2 opacity-80 font-medium">{convTo.toUpperCase()}</span>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )}

              {mode === 'Graph' && (
                <motion.div 
                  key="graph" 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }} 
                  className="space-y-6 max-w-4xl mx-auto"
                >
                  <GlassCard title="Function Plotter" icon={LineChart}>
                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                      <div className="flex-1 relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--accent)] font-bold italic text-lg opacity-80">y =</span>
                        <input 
                          value={graphExpr} 
                          onChange={(e) => setGraphExpr(e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && plotGraph()}
                          placeholder="x^2 + 2x + 1"
                          className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl pl-16 pr-6 py-4 text-lg outline-none focus:ring-2 ring-[var(--accent)]/20 shadow-sm transition-all font-mono" 
                        />
                      </div>
                      <Button onClick={plotGraph} variant="primary" className="px-8 py-4 text-base rounded-2xl">Plot Function</Button>
                    </div>
                    
                    <div className="h-[450px] w-full bg-[var(--card-bg)] rounded-3xl border border-[var(--card-border)] p-6 shadow-inner relative overflow-hidden">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={graphData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorY" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--card-border)" opacity={0.5} />
                          <XAxis 
                            dataKey="x" 
                            stroke="var(--muted-foreground)" 
                            fontSize={12} 
                            axisLine={false} 
                            tickLine={false}
                            type="number"
                            domain={['auto', 'auto']}
                            tickMargin={10}
                          />
                          <YAxis 
                            stroke="var(--muted-foreground)" 
                            fontSize={12} 
                            axisLine={false} 
                            tickLine={false} 
                            domain={['auto', 'auto']}
                            tickMargin={10}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '16px', 
                              border: '1px solid var(--card-border)',
                              backgroundColor: 'var(--card-bg)',
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                              color: 'var(--text)',
                              padding: '12px 16px',
                              fontWeight: 500
                            }}
                            itemStyle={{ color: 'var(--accent)', fontWeight: 600 }}
                            labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="y" 
                            stroke="var(--accent)" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorY)" 
                            activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--accent)' }}
                            animationDuration={1000}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="mt-6 flex justify-center gap-6 text-[10px] font-bold uppercase opacity-40 tracking-widest">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                        <span>Range: -10 to 10</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                        <span>Step: 0.5</span>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <GlassCard title="History" icon={HistoryIcon} collapsible>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="py-8 text-center opacity-40 italic text-xs font-medium">No calculations yet</div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--accent)]/40 hover:shadow-[0_4px_20px_-5px_rgba(var(--accent-rgb),0.15)] transition-all cursor-pointer group relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10">
                        <div className="text-[10px] font-mono opacity-40 mb-2 flex justify-between items-center uppercase tracking-wider">
                          <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                          <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--accent)]" />
                        </div>
                        <div className="text-xs font-mono opacity-70 truncate mb-2">{item.expression}</div>
                        <div className="text-lg font-bold text-[var(--accent)] tracking-tight">{item.result}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
            
            <GlassCard title="Insights" icon={Sparkles}>
              <div className="text-sm opacity-70 leading-relaxed font-medium">
                {expression ? (
                  <p>Analyzing <span className="text-[var(--accent)] font-mono px-1 py-0.5 rounded bg-[var(--accent)]/10 border border-[var(--accent)]/20">{expression}</span>. Ready to evaluate.</p>
                ) : (
                  "Perform a calculation to see live insights."
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </main>

      <footer className="max-w-7xl mx-auto p-8 text-center flex flex-col items-center gap-2">
        <div className="opacity-20 text-[10px] font-bold uppercase tracking-widest text-[var(--text)]">
          Calcify • Stable v1.0
        </div>
        <div className="developer-footer text-[#94a3b8] text-[13px] mt-2">
          Developed with love by <a href="#" className="hover:text-[var(--text)] transition-colors">Khushi Pardhi</a>
        </div>
      </footer>

      {/* Contact Us Modal */}
      <AnimatePresence>
        {isContactModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsContactModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[var(--bg)] border border-[var(--card-border)] rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-[var(--card-border)] bg-[var(--muted)]/30">
                <h2 className="text-xl font-bold">Help Improve Calcify</h2>
                <button 
                  onClick={() => setIsContactModalOpen(false)}
                  className="p-2 rounded-full hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--text)]"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                  Built by an engineering student at Priyadarshini College of Engineering to make technical calculations smarter and cleaner. Found a bug or have a feature request? Let me know!
                </p>
                <form
                  ref={contactFormRef}
                  className="space-y-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setContactStatus('sending');
                    try {
                      const emailjs = (window as any).emailjs;
                      if (!emailjs) throw new Error('EmailJS not loaded');
                      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
                      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';
                      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';
                      await emailjs.sendForm(serviceId, templateId, contactFormRef.current!, publicKey);
                      setContactStatus('success');
                      contactFormRef.current?.reset();
                    } catch (err) {
                      console.error('EmailJS error:', err);
                      setContactStatus('error');
                    }
                  }}
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider opacity-60 ml-1">Name</label>
                    <input
                      type="text"
                      name="from_name"
                      required
                      className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-[var(--accent)]/20 transition-all shadow-sm"
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider opacity-60 ml-1">Email</label>
                    <input
                      type="email"
                      name="reply_to"
                      required
                      className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-[var(--accent)]/20 transition-all shadow-sm"
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider opacity-60 ml-1">Suggestion / Bug Report</label>
                    <textarea
                      name="message"
                      required
                      rows={4}
                      className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-[var(--accent)]/20 transition-all shadow-sm resize-none custom-scrollbar"
                      placeholder="Tell me what you think..."
                    />
                  </div>

                  {/* Status Messages */}
                  <AnimatePresence>
                    {contactStatus === 'success' && (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                        <Check size={16} /> Message sent successfully! Thank you.
                      </motion.div>
                    )}
                    {contactStatus === 'error' && (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                        <AlertCircle size={16} /> Failed to send. Please try again or check your EmailJS config.
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full py-3 mt-2"
                    disabled={contactStatus === 'sending'}
                  >
                    {contactStatus === 'sending' ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
