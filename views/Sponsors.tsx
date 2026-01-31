
import React, { useState } from 'react';
import { Lead, LeadStatus } from '../types';
import { generateDraft } from '../services/geminiService';

const MOCK_LEADS: Lead[] = [
  { id: '#9942', company: 'TechNova Systems', initial: 'T', status: LeadStatus.DRAFTED, lastActivity: '2h ago', research: { funding: '12M Series A', stack: 'React, Node, AWS', decisionMaker: 'Sarah Chen, CTO', verified: true } },
  { id: '#9941', company: 'Orbital Dynamics', initial: 'O', status: LeadStatus.NOT_CONTACTED, lastActivity: '--', research: { funding: 'Seed 2M', stack: 'Python, GCP', decisionMaker: 'John Doe, Lead Eng', verified: false } },
  { id: '#9938', company: 'Pixel & Code', initial: 'P', status: LeadStatus.REPLIED, lastActivity: '1d ago', research: { funding: 'Bootstrapped', stack: 'Next.js, Vercel', decisionMaker: 'Mike Rossi, Founder', verified: true } },
  { id: '#9920', company: 'Acme Corp', initial: 'A', status: LeadStatus.SENT, lastActivity: '3d ago', research: { funding: 'IPO 2021', stack: 'Java, Azure', decisionMaker: 'Elena Smith, VP Eng', verified: true } },
];

const Sponsors: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [selectedId, setSelectedId] = useState<string | null>(leads[0].id);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedLead = leads.find(l => l.id === selectedId) || leads[0];

  const handleGenerate = async () => {
    if (!selectedLead) return;
    setIsGenerating(true);
    try {
      const draft = await generateDraft(selectedLead.company, selectedLead.research);
      setLeads(prev => prev.map(l => l.id === selectedId ? { ...l, draft, status: LeadStatus.DRAFTED } : l));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Table Section */}
      <div className="flex-1 flex flex-col bg-background border-r border-border min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-[#121212] shrink-0">
          <h2 className="text-lg font-bold text-white font-display tracking-tight">Outreach Lead Management</h2>
          <div className="flex items-center gap-3">
            <input className="bg-[#121212] border border-border text-gray-300 text-sm rounded-sm pl-4 pr-3 py-1 placeholder-gray-600 w-48 focus:border-white focus:ring-0 font-mono" placeholder="Filter..." type="text"/>
            <button className="flex items-center gap-2 px-3 py-1 bg-white text-black text-xs font-bold uppercase tracking-wide font-mono rounded-sm">
              NEW
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-[#121212] text-[10px] uppercase text-gray-500 font-mono tracking-widest">
                <th className="px-6 py-3 font-normal">Company</th>
                <th className="px-6 py-3 font-normal">Status</th>
                <th className="px-6 py-3 font-normal">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.map((lead) => (
                <tr 
                  key={lead.id}
                  onClick={() => setSelectedId(lead.id)}
                  className={`group transition-colors cursor-pointer border-l-2 ${selectedId === lead.id ? 'bg-[#161616] border-white' : 'hover:bg-[#161616] border-transparent'}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-sm bg-[#222] flex items-center justify-center text-white font-mono text-xs border border-[#333]">{lead.initial}</div>
                      <div>
                        <p className="text-white font-medium text-sm font-mono leading-none">{lead.company}</p>
                        <p className="text-gray-500 text-[10px] mt-1 font-mono uppercase">{lead.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-mono bg-[#333] text-white border border-[#404040]">
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{lead.lastActivity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor/Research Panel */}
      <aside className="w-[480px] bg-[#121212] flex flex-col shrink-0">
        <div className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="font-bold text-white text-base font-mono tracking-wide">{selectedLead.company}</h3>
          <div className="flex gap-2">
            <button className="size-8 flex items-center justify-center rounded-sm text-gray-500 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest font-mono">Research Facts</h4>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border border border-border rounded-sm overflow-hidden">
              <div className="p-3 bg-[#121212]">
                <p className="text-[10px] text-gray-500 uppercase mb-1 font-mono">Funding</p>
                <p className="text-sm font-medium text-gray-200">{selectedLead.research.funding}</p>
              </div>
              <div className="p-3 bg-[#121212]">
                <p className="text-[10px] text-gray-500 uppercase mb-1 font-mono">Stack</p>
                <p className="text-sm font-medium text-gray-200">{selectedLead.research.stack}</p>
              </div>
              <div className="p-3 bg-[#121212] col-span-2">
                <p className="text-[10px] text-gray-500 uppercase mb-1 font-mono">Decision Maker</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-200">{selectedLead.research.decisionMaker}</p>
                  {selectedLead.research.verified && (
                    <span className="text-[10px] text-green-500 flex items-center gap-1 font-mono uppercase">VERIFIED</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest font-mono">Draft Editor</h4>
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="text-white text-[10px] hover:underline font-mono uppercase disabled:opacity-50"
              >
                {isGenerating ? 'GEN_IN_PROGRESS...' : 'AI_REFRESH'}
              </button>
            </div>
            <div className="flex flex-col rounded-sm border border-border bg-[#121212] flex-1 overflow-hidden">
              <textarea 
                className="w-full h-full bg-transparent border-0 p-4 text-sm text-gray-300 focus:ring-0 resize-none font-mono leading-relaxed"
                value={selectedLead.draft || "// No draft content. Click AI_REFRESH to generate."}
                onChange={(e) => setLeads(prev => prev.map(l => l.id === selectedId ? { ...l, draft: e.target.value } : l))}
                spellCheck="false"
              />
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-border flex justify-between items-center bg-[#121212]">
          <button className="text-gray-500 hover:text-red-400 text-xs font-mono uppercase">Delete</button>
          <div className="flex gap-3">
            <button className="px-4 py-2 border border-border text-gray-300 text-xs font-mono uppercase">Save</button>
            <button className="px-4 py-2 bg-white text-black text-xs font-bold font-mono uppercase">Send Email</button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Sponsors;
