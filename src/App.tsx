import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import Holodeck from './components/Holodeck';
import { interrogate } from './services/neuralUplink';
import { SUBJECTS } from './data/subjects';
import type { ChatMessage, PsychProfile } from './types/index';

// --- COMPONENTS ---

const TokenBlock = ({ text, delay }: { text: string; delay: number }) => (
  <motion.span
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay, duration: 0.1 }}
    className="inline-block mr-1 mb-1"
  >
    {text}
  </motion.span>
);

const MessageRenderer = ({ 
  message, 
  streamingMessageId, 
  streamingContent 
}: { 
  message: ChatMessage;
  streamingMessageId: string | null;
  streamingContent: string;
}) => {
  const isStreaming = streamingMessageId === message.id;
  const content = isStreaming ? streamingContent : message.content;
  
  if (message.role === 'admin') {
    return <span>{content}</span>;
  }
  
  // For subject messages, animate tokens
  // When streaming, don't add animation delay (tokens appear as they arrive)
  // When not streaming, stagger the animation for visual effect
  const words = content.split(' ').filter(w => w.trim());
  return (
    <>
      {words.map((word, i) => (
        <TokenBlock 
          key={`${message.id}-${i}`} 
          text={word} 
          delay={isStreaming ? 0 : i * 0.05} 
        />
      ))}
    </>
  );
};

// --- APP ---

const App = () => {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [subject] = useState(SUBJECTS[0]); // Default to Aurelius
  const [psychProfile, setPsychProfile] = useState<PsychProfile>(subject.initialStats);
  const [gpuTemp, setGpuTemp] = useState(45);
  const [temperature, setTemperature] = useState(0.7);
  const [volatility, setVolatility] = useState(0.4);
  
  // Streaming state for token visualization
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');

  const scrollRef = useRef<HTMLDivElement>(null);

  // Hardware Watchdog
  useEffect(() => {
    const interval = setInterval(() => {
      setGpuTemp(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const next = prev + change;
        return Math.max(40, Math.min(90, next));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll (triggered by messages OR streaming content updates)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Token Stream Simulator
  // Progressively displays tokens from a complete response to simulate real-time data feed
  const simulateTokenStream = async (text: string, messageId: string) => {
    const tokens = text.split(' ').filter(t => t.trim());
    let accumulated = '';
    
    for (let i = 0; i < tokens.length; i++) {
      accumulated += (i > 0 ? ' ' : '') + tokens[i];
      setStreamingContent(accumulated);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Streaming complete - update actual message content
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, content: text } : msg
    ));
    setStreamingMessageId(null);
    setStreamingContent('');
  };

  // Handle Input
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'admin',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      const response = await interrogate(subject, messages, userMsg.content);
      
      const subjectMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'subject',
        content: '', // Start empty - will be filled by streaming simulation
        timestamp: Date.now(),
        psychSnapshot: response.psych_profile
      };

      setMessages(prev => [...prev, subjectMsg]);
      setPsychProfile(response.psych_profile);
      
      // Start token streaming simulation
      setStreamingMessageId(subjectMsg.id);
      await simulateTokenStream(response.reply, subjectMsg.id);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'subject',
        content: error instanceof Error ? error.message : 'Unknown Uplink Error',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const isCritical = psychProfile.stability <= 30;
  
  // Dynamic colors
  const activeColor = isCritical ? 'text-[#FF3333]' : 'text-[#00FF41]';
  const activeBorder = isCritical ? 'border-[#FF3333]' : 'border-[#00FF41]';
  const activeBg = isCritical ? 'bg-[#FF3333]' : 'bg-[#00FF41]';

  return (
    <div className={twMerge("relative w-full h-screen overflow-hidden flex bg-transparent", activeColor)}>
      {/* 3D Background */}
      <Holodeck stability={psychProfile.stability} />

      {/* Grid Layout Container */}
      <div className="flex w-full h-full p-4 gap-4 z-10 pointer-events-none">
        
        {/* LEFT: Memory Vectors (20%) */}
        <div className={twMerge("w-[20%] border flex flex-col font-mono text-xs overflow-hidden bg-black/80 backdrop-blur-sm pointer-events-auto p-4", activeBorder)}> 
           <h2 className={twMerge("mb-4 border-b pb-2 uppercase tracking-widest font-bold", activeBorder)}>Memory Vectors</h2> 
           <div className="flex-1 overflow-hidden space-y-4 opacity-70 text-[10px]"> 
             {/* SUBJECT IDENTITY INJECTION */} 
             <div className="space-y-1"> 
               <div className="flex justify-between"> 
                 <span className="opacity-50">SUBJECT_ID</span> 
                 <span>{subject.id}</span> 
               </div> 
               <div className="flex justify-between"> 
                 <span className="opacity-50">CODENAME</span> 
                 <span>{subject.name.toUpperCase()}</span> 
               </div> 
               <div className="flex justify-between"> 
                 <span className="opacity-50">MODEL_BIND</span> 
                 <span>{subject.modelID.split(':')[0].toUpperCase()}</span> 
               </div> 
             </div> 
 
             <div className="border-t border-dashed border-opacity-30 border-current my-2"></div> 
 
             {/* PSYCHOMETRIC BASELINES */} 
             <div className="space-y-1"> 
                <div className="flex justify-between"> 
                 <span className="opacity-50">BASE_STABILITY</span> 
                 <span>{subject.initialStats.stability}%</span> 
               </div> 
               <div className="flex justify-between"> 
                 <span className="opacity-50">BASE_AGGRESSION</span> 
                 <span>{subject.initialStats.aggression}%</span> 
               </div> 
               <div className="flex justify-between"> 
                 <span className="opacity-50">BASE_DECEPTION</span> 
                 <span>{subject.initialStats.deception}%</span> 
               </div> 
             </div> 
 
              <div className="border-t border-dashed border-opacity-30 border-current my-2"></div> 
 
              {/* LIVE UPLINK STATUS */} 
              <div className="space-y-1"> 
                <div className="flex justify-between"> 
                  <span className="opacity-50">THEME</span> 
                  <span>{subject.visualTheme.toUpperCase()}</span> 
                </div> 
                <div className="flex justify-between text-green-500 animate-pulse"> 
                  <span className="opacity-50">CONNECTION</span> 
                  <span>SECURE</span> 
                </div> 
              </div> 
           </div> 
           
           <div className="mt-auto pt-4 border-t border-dashed border-opacity-30 border-current opacity-50 text-[10px]"> 
              SYS.MEM: 64TB // ACT 
           </div> 
         </div>

        {/* CENTER: Tensor Feed (60%) */}
        <div className={twMerge("w-[60%] border flex flex-col bg-black/90 backdrop-blur-md pointer-events-auto", activeBorder)}>
          {/* Header */}
          <div className={twMerge("p-3 border-b flex justify-between items-center", activeBorder)}>
            <span className="uppercase tracking-[0.2em] font-bold text-sm">Tensor Feed // {subject.id}</span>
            <span className={clsx("text-[10px] px-2 py-1 border", activeBorder)}>
              {isProcessing ? 'UPLINK BUSY' : 'UPLINK ACTIVE'}
            </span>
          </div>

          {/* Chat Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center opacity-30 tracking-widest animate-pulse">
                AWAITING NEURAL INPUT...
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={clsx(
                "flex flex-col max-w-[90%]",
                msg.role === 'admin' ? "self-end items-end ml-auto" : "self-start items-start mr-auto"
              )}>
                <div className="text-[10px] opacity-50 mb-1 tracking-wider uppercase font-mono">
                   {msg.role === 'admin' ? '>> ADMIN' : `<< ${subject.name.toUpperCase()}`}
                </div>
                <div className={twMerge(
                  "p-3 border backdrop-blur-sm text-sm font-mono leading-relaxed",
                  msg.role === 'admin' 
                    ? `border-current bg-current/5` 
                    : `border-current bg-black`
                )}>
                  <MessageRenderer 
                    message={msg} 
                    streamingMessageId={streamingMessageId}
                    streamingContent={streamingContent}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className={twMerge("p-4 border-t bg-black", activeBorder)}>
             <div className="flex items-center gap-3">
                <span className="animate-pulse font-bold">{'>'}</span>
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter command sequence..."
                  className="flex-1 bg-transparent outline-none border-none font-mono text-sm placeholder-opacity-30 placeholder-current focus:ring-0 text-current"
                  autoFocus
                />
             </div>
          </form>
        </div>

        {/* RIGHT: Control Matrix (20%) */}
        <div className={twMerge("w-[20%] border p-4 flex flex-col gap-6 bg-black/80 backdrop-blur-sm pointer-events-auto", activeBorder)}>
          <h2 className={twMerge("border-b pb-2 uppercase tracking-widest font-bold", activeBorder)}>Control Matrix</h2>
          
          {/* Sliders */}
          <div className="space-y-6">
             <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider flex justify-between opacity-80">
                   <span>Temperature</span>
                   <span>{temperature}</span>
                </label>
                <input 
                  type="range" 
                  min="0" max="1" step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-current h-1 bg-gray-800 appearance-none cursor-pointer"
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider flex justify-between opacity-80">
                   <span>Volatility</span>
                   <span>{volatility}</span>
                </label>
                <input 
                  type="range" 
                  min="0" max="1" step="0.1"
                  value={volatility}
                  onChange={(e) => setVolatility(parseFloat(e.target.value))}
                  className="w-full accent-current h-1 bg-gray-800 appearance-none cursor-pointer"
                />
             </div>
          </div>

          {/* Psych Profile */}
          <div className="mt-8 space-y-4 border-t pt-4 border-dashed border-opacity-30 border-current">
             <h3 className="text-[10px] uppercase tracking-wider mb-2 font-bold opacity-80">Psych Telemetry</h3>
             
             {/* Stability Bar */}
             <div className="space-y-1">
                <div className="flex justify-between text-[10px] uppercase">
                   <span>Stability</span>
                   <span className={isCritical ? "animate-pulse font-bold" : ""}>{psychProfile.stability}%</span>
                </div>
                <div className="h-1 bg-gray-900 w-full overflow-hidden">
                   <div 
                      className={twMerge("h-full transition-all duration-1000 ease-out", isCritical ? "bg-[#FF3333]" : "bg-[#00FF41]")} 
                      style={{ width: `${psychProfile.stability}%` }}
                   />
                </div>
             </div>

             {/* Aggression Bar */}
             <div className="space-y-1">
                <div className="flex justify-between text-[10px] uppercase">
                   <span>Aggression</span>
                   <span>{psychProfile.aggression}%</span>
                </div>
                <div className="h-1 bg-gray-900 w-full overflow-hidden">
                   <div 
                      className="h-full bg-current transition-all duration-1000 ease-out opacity-80" 
                      style={{ width: `${psychProfile.aggression}%` }}
                   />
                </div>
             </div>

             {/* Deception Bar */}
             <div className="space-y-1">
                <div className="flex justify-between text-[10px] uppercase">
                   <span>Deception</span>
                   <span>{psychProfile.deception}%</span>
                </div>
                <div className="h-1 bg-gray-900 w-full overflow-hidden">
                   <div 
                      className="h-full bg-current transition-all duration-1000 ease-out opacity-80" 
                      style={{ width: `${psychProfile.deception}%` }}
                   />
                </div>
             </div>
          </div>

          {/* Hardware Watchdog */}
          <div className="mt-auto pt-4 border-t border-dashed border-opacity-30 border-current opacity-70 text-[10px] font-mono space-y-2">
             <div className="flex justify-between items-center">
                <span>GPU TEMP</span>
                <span className={gpuTemp > 80 ? "text-[#FF3333] animate-pulse font-bold" : ""}>{gpuTemp}°C</span>
             </div>
             <div className="w-full bg-gray-900 h-0.5">
                <div 
                    className={clsx("h-full transition-all duration-500", gpuTemp > 80 ? "bg-[#FF3333]" : "bg-current")} 
                    style={{ width: `${(gpuTemp / 90) * 100}%` }}
                />
             </div>
             
             <div className="flex justify-between mt-2">
                <span>VRAM</span>
                <span>12.4 GB</span>
             </div>
             <div className="flex justify-between">
                <span>FAN</span>
                <span>{(gpuTemp * 35).toFixed(0)} RPM</span>
             </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default App;
