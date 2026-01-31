
import React from 'react';

const Settings: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full px-8 py-10 flex flex-col gap-10">
        <header className="flex flex-col gap-3 pb-4 border-b border-border">
          <h1 className="text-3xl font-bold text-white tracking-tight font-display">System Configuration</h1>
          <p className="text-gray-400 text-base max-w-2xl">Manage integration behavior, privacy boundaries, and AI interaction parameters.</p>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-white font-display border-b border-border pb-2">Integrations</h2>
          <div className="border border-border bg-surface rounded-sm overflow-hidden">
            {[
              { label: 'Google Drive', detail: 'Synced: 23m ago', active: true, icon: 'add_to_drive' },
              { label: 'Discord Community', detail: 'Listening on #general', active: true, icon: 'forum' },
              { label: 'GitHub Repository', detail: 'Not connected', active: false, icon: 'code' }
            ].map((item, i) => (
              <div key={i} className="p-4 flex items-center justify-between border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-background border border-border rounded-sm text-gray-400">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{item.label}</span>
                    <span className="text-xs text-gray-500 font-mono">{item.detail}</span>
                  </div>
                </div>
                <div>
                  {item.active ? (
                    <span className="text-[10px] text-green-500 font-mono font-bold">ACTIVE</span>
                  ) : (
                    <button className="text-[10px] border border-border px-3 py-1 rounded-sm text-white font-mono">CONNECT</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-white font-display border-b border-border pb-2">Privacy & Exclusion</h2>
          <div className="bg-surface border border-border p-6 rounded-sm flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-white">Excluded Drive Paths</label>
              <textarea 
                className="w-full h-32 bg-background border border-border rounded-sm p-3 text-xs text-gray-400 font-mono focus:ring-0"
                defaultValue={"/finance/quarterly-reports/*\n/legal/contracts/drafts/*"}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-background border border-border">
                <span className="text-sm text-white">PII Scrubbing</span>
                <div className="w-10 h-5 bg-green-500 rounded-full flex justify-end p-1"><div className="w-3 h-3 bg-white rounded-full"></div></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-background border border-border">
                <span className="text-sm text-white">Ephemeral Mode</span>
                <div className="w-10 h-5 bg-border rounded-full flex justify-start p-1"><div className="w-3 h-3 bg-gray-500 rounded-full"></div></div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-4 pt-6 pb-12 border-t border-border">
          <button className="px-6 py-2 text-gray-400 hover:text-white transition-colors text-sm font-mono">DISCARD</button>
          <button className="px-6 py-2 bg-white text-black font-bold text-sm font-mono">SAVE_CHANGES</button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
