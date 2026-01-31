
import React from 'react';

const Analytics: React.FC = () => {
  const metrics = [
    { label: 'Outreach Velocity', value: '42 emails/day', trend: '+12%', color: 'text-white' },
    { label: 'Response Delta', value: '18.4%', trend: '-2%', color: 'text-green-500' },
    { label: 'Conversion Lift', value: '8.2%', trend: '+0.5%', color: 'text-white' },
    { label: 'AI Accuracy', value: '94.8%', trend: '+1.2%', color: 'text-blue-500' }
  ];

  const recentEvents = [
    { time: '14:02', event: 'Lead #9942 Status changed to [DRAFTED]', origin: 'AI-CORE' },
    { time: '13:58', event: 'Mission parameters successfully parsed', origin: 'SCANNER' },
    { time: '12:45', event: 'Connection established with Discord Community', origin: 'GATEWAY' },
    { time: '11:20', event: 'Outreach cycle #084 initiated', origin: 'SYSTEM' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-12">
      <div className="max-w-6xl mx-auto flex flex-col gap-10">
        <header className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">[ METRICS_OS ]</span>
          <h1 className="text-3xl font-medium text-white tracking-tight font-display">System Analytics</h1>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((m, i) => (
            <div key={i} className="bg-surface border border-border p-6 rounded-sm flex flex-col gap-2">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{m.label}</span>
              <div className="flex items-baseline justify-between">
                <span className={`text-2xl font-display ${m.color}`}>{m.value}</span>
                <span className="text-[10px] font-mono text-gray-400">{m.trend}</span>
              </div>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col border border-border bg-background h-[400px]">
            <div className="px-5 py-3 border-b border-border flex justify-between items-center">
              <h3 className="font-normal text-gray-400 text-xs font-mono uppercase tracking-wide">Performance Curve</h3>
              <div className="flex gap-4">
                <span className="text-[10px] text-gray-600 font-mono">24H</span>
                <span className="text-[10px] text-white font-mono">7D</span>
                <span className="text-[10px] text-gray-600 font-mono">30D</span>
              </div>
            </div>
            <div className="flex-1 p-8 flex items-center justify-center relative">
              {/* Mock Chart Visualization */}
              <div className="absolute inset-x-8 bottom-8 h-[70%] border-l border-b border-border flex items-end justify-between px-4">
                {[40, 60, 45, 90, 75, 80, 55, 65, 95, 85].map((h, i) => (
                  <div key={i} className="w-4 bg-white/10 border-t border-white/40" style={{ height: `${h}%` }}></div>
                ))}
              </div>
              <span className="text-[10px] font-mono text-gray-700 uppercase">Interactive data visualization rendering...</span>
            </div>
          </div>

          <div className="flex flex-col border border-border bg-background h-[400px]">
             <div className="px-5 py-3 border-b border-border">
              <h3 className="font-normal text-gray-400 text-xs font-mono uppercase tracking-wide">Live Event Stream</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {recentEvents.map((e, i) => (
                <div key={i} className="flex gap-4 border-l border-white/20 pl-4 py-1">
                  <span className="text-[10px] font-mono text-gray-600 shrink-0">{e.time}</span>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-white font-mono leading-tight">{e.event}</p>
                    <span className="text-[9px] text-gray-500 font-mono uppercase">{e.origin}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-border flex justify-center">
               <button className="text-[10px] font-mono text-gray-500 hover:text-white uppercase transition-colors">View All Logs</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
