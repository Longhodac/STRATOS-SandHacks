
import React, { useState } from 'react';
import { parseMissionData } from '../services/geminiService';
import { ParsedEntity } from '../types';

const DataScan: React.FC = () => {
  const [input, setInput] = useState(`Target: Secure Series A Sponsorship\nAmount: $50,000 USD\nTimeline: Q3 2024\nFocus: Tech Infrastructure, Cloud Services\nType: In-Kind + Monetary`);
  const [entities, setEntities] = useState<ParsedEntity[]>([
    { label: 'Funding Goal', value: '$50,000.00 (USD)' },
    { label: 'Resource Type', value: 'In-Kind (Cloud Services)' },
    { label: 'Deadline', value: 'Q3 2024 (~90 Days)' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleParse = async () => {
    setIsLoading(true);
    try {
      const results = await parseMissionData(input);
      if (results && results.length > 0) {
        setEntities(results);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full px-8 py-12 flex flex-col min-h-full">
        <header className="flex flex-col gap-6 mb-8">
          <nav className="flex items-center gap-2 text-xs font-mono text-gray-500">
            <span>Home</span>
            <span>/</span>
            <span>Campaigns</span>
            <span>/</span>
            <span className="text-white">New Outreach Cycle</span>
          </nav>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-white tracking-tight font-display">Active Goal Parameters</h1>
            <p className="text-gray-500 text-sm font-mono max-w-2xl">Enter raw mission data. System will parse for variables.</p>
          </div>
        </header>

        <section className="flex flex-col gap-8 flex-1">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Mission Input</label>
              <span className="text-[10px] font-mono text-gray-600">TXT-PLAIN</span>
            </div>
            <textarea 
              className="w-full h-64 p-4 bg-background border border-border rounded-sm text-sm font-mono text-white focus:ring-1 focus:ring-white/20 resize-none leading-relaxed transition-colors"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="// Paste mission parameters here..."
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Parsed Entities</h3>
              <span className="text-[10px] font-mono text-gray-600">{entities.length} ITEMS FOUND</span>
            </div>
            <div className="grid grid-cols-1 border-t border-border">
              {entities.map((entity, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-l border-r border-border hover:bg-surface transition-colors">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase text-gray-500 font-mono tracking-wider">Label</span>
                    <span className="text-sm text-white font-mono">{entity.label}</span>
                  </div>
                  <div className="flex flex-col gap-1 sm:text-right mt-2 sm:mt-0">
                    <span className="text-[10px] uppercase text-gray-500 font-mono tracking-wider">Value</span>
                    <span className="text-sm text-white font-mono">{entity.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-8 pt-8 flex justify-end gap-4 border-t border-border">
          <button className="px-6 py-2 border border-border text-gray-500 font-mono text-xs uppercase hover:text-white transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleParse}
            disabled={isLoading}
            className="px-6 py-2 bg-white text-black font-mono text-xs font-bold uppercase transition-all flex items-center gap-2"
          >
            {isLoading ? 'Processing...' : 'Start Outreach Cycle'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataScan;
