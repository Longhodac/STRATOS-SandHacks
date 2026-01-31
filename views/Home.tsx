
import React from 'react';

const Home: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-12">
      <div className="max-w-6xl mx-auto flex flex-col gap-10">
        <header className="flex flex-col gap-4 border-b border-border pb-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">[ CONTEXT_V1.0 ]</span>
              <h1 className="text-3xl font-medium text-white tracking-tight font-display">Context Dashboard</h1>
              <p className="text-gray-400 text-sm font-light">Environment variables and context blocks.</p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 border border-border bg-background text-gray-400 text-xs font-mono hover:text-white transition-colors">
                RESET_DEFAULTS
              </button>
              <button className="px-4 py-2 border border-border bg-background text-white text-xs font-mono hover:bg-surface transition-colors">
                SAVE_CHANGES
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col border border-border bg-background">
            <div className="px-5 py-3 border-b border-border flex justify-between items-center">
              <h3 className="font-normal text-gray-400 text-xs font-mono uppercase tracking-wide">01 // Mission Statement</h3>
              <span className="text-[10px] text-gray-600 font-mono">[EDITABLE]</span>
            </div>
            <div className="p-6 flex-1">
              <textarea 
                className="w-full h-32 bg-transparent border-0 p-0 text-white text-sm font-mono focus:ring-0 resize-none leading-relaxed"
                defaultValue="To create a sustainable, engineer-first ecosystem that prioritizes data integrity and seamless onboarding experiences for new outreach members."
              />
            </div>
            <div className="px-5 py-3 border-t border-border flex gap-4 items-center">
              <span className="text-[10px] text-green-500 font-mono uppercase">Status: Active</span>
              <span className="text-[10px] text-gray-600 font-mono">Last modified: 2m ago</span>
            </div>
          </div>

          <div className="flex flex-col border border-border bg-background">
            <div className="px-5 py-3 border-b border-border flex justify-between items-center">
              <h3 className="font-normal text-gray-400 text-xs font-mono uppercase tracking-wide">02 // Members</h3>
              <span className="material-symbols-outlined text-gray-600 text-[18px]">more_horiz</span>
            </div>
            <div className="p-8 flex flex-col justify-center flex-1">
              <span className="text-5xl font-light text-white font-display tracking-tight">1,024</span>
              <span className="text-xs text-gray-500 font-mono mt-2">+12% growth (7d)</span>
            </div>
            <div className="px-5 py-3 border-t border-border flex justify-between items-center">
              <span className="text-[10px] text-gray-500 font-mono uppercase">System Capacity</span>
              <span className="text-[10px] text-white font-mono">75%</span>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h3 className="text-xs font-medium text-gray-400 font-mono uppercase tracking-wide pl-1">04 // System Confidence</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Data Integrity', value: '95% confidence', status: 'VERIFIED' },
              { label: 'Source Reliability', value: '85% confidence', status: 'STABLE' },
              { label: 'User Engagement', value: '60% confidence', status: 'INSUFFICIENT' }
            ].map((card, i) => (
              <div key={i} className="flex flex-col justify-center p-6 border border-border bg-background h-28">
                <span className="text-sm font-medium text-white font-display">{card.label}</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-xs text-gray-400 font-mono">{card.value}</span>
                  <span className={`text-[10px] font-mono ${card.status === 'VERIFIED' ? 'text-green-500' : 'text-gray-600'}`}>
                    {card.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
