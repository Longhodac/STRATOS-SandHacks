
import React, { useState, useEffect, useRef } from 'react';
import { createStrategyChat } from '../services/geminiService';
import { GenerateContentResponse } from '@google/genai';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const Advisor: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'STRATOS Advisor online. How can I assist with your outreach research architecture today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current = createStrategyChat();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await chatRef.current.sendMessage({ message: input });
      const responseText = result.text || "Consultation complete. No data returned.";
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error("Strategy Chat Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "ERROR :: Connection to Strategy Core lost. Please re-initialize." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background h-screen overflow-hidden">
      <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
        <div className="flex flex-col">
          <h2 className="text-sm font-bold text-white font-mono tracking-tight">STRATEGIC_ADVISOR_V2</h2>
          <span className="text-[10px] text-green-500 font-mono uppercase tracking-widest">Neural Uplink Active</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[9px] text-gray-500 font-mono uppercase">Model</span>
            <span className="text-[10px] text-white font-mono">Gemini 3 Pro</span>
          </div>
          <button className="p-2 border border-border hover:bg-surface transition-colors rounded-sm">
            <span className="material-symbols-outlined text-gray-400 text-[20px]">refresh</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-8">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[75%] p-4 rounded-sm border ${
                msg.role === 'user' 
                  ? 'bg-surface border-border text-white' 
                  : 'bg-background border-border text-gray-300'
              }`}>
                <div className="flex items-center gap-2 mb-2 opacity-50">
                  <span className="text-[10px] font-mono uppercase tracking-widest">
                    {msg.role === 'user' ? 'CLIENT_INPUT' : 'STRATOS_ADVISORY'}
                  </span>
                </div>
                <div className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="p-4 bg-background border border-border text-gray-500 text-[10px] font-mono animate-pulse uppercase tracking-widest">
                Computing strategy vectors...
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 border-t border-border bg-[#121212] shrink-0">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input 
            type="text" 
            className="flex-1 bg-background border border-border text-white text-sm font-mono p-4 rounded-sm focus:ring-1 focus:ring-white focus:border-white transition-all outline-none"
            placeholder="TYPE_MESSAGE_HERE..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-8 py-4 bg-white text-black font-bold font-mono text-sm uppercase rounded-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            EXECUTE
          </button>
        </div>
        <p className="max-w-4xl mx-auto text-[9px] text-gray-600 font-mono mt-3 uppercase text-center tracking-widest">
          STRATOS Strategic Advisory is an AI-driven system. Verify critical business data before execution.
        </p>
      </div>
    </div>
  );
};

export default Advisor;
