import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFocus } from '@/lib/FocusContext';
import { useSelectedLead } from '@/lib/SelectedLeadContext';
import { useTemplateModal } from '@/lib/TemplateModalContext';
import { useAgentBridge } from '@/lib/AgentBridgeContext';
import { useAgentMode } from '@/lib/AgentModeContext';
import { useClubProfile } from '@/lib/ClubProfileContext';
import { getMeatFromFocus, fillTemplate } from '@/lib/templateUtils';
import { createSidebarChat, deepResearchLead, analyzeTemplateStructure, generateHook } from '@/services/geminiService';
import type { FocusTemplateBricks, AgentMode } from '@/types';
import { AGENT_MODE_LABELS } from '@/types';
import { cn } from '@/lib/utils';

export type SidebarMessage = {
  id: string;
  role: 'user' | 'agent';
  text: string;
  actions?: Array<{ id: string; label: string; type: string }>;
};

type AgentSidebarProps = {
  onToggle: () => void;
};

const MAX_SYSTEM_LOG_LINES = 50;

const AGENT_MODES: AgentMode[] = ['discovery', 'research', 'drafting', 'strategy'];

const AgentSidebar: React.FC<AgentSidebarProps> = ({ onToggle }) => {
  const { activeFocus, getFocus, updateFocus } = useFocus();
  const { selectedLeadId } = useSelectedLead();
  const { templateModalFocusId, applySuggestedBricks } = useTemplateModal();
  const { pushHook } = useAgentBridge();
  const { mode, modeOverride, setModeOverride } = useAgentMode();
  const { profile } = useClubProfile();
  const [messages, setMessages] = useState<SidebarMessage[]>([]);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [systemLog, setSystemLog] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const [lastSuggestedBricks, setLastSuggestedBricks] = useState<Partial<FocusTemplateBricks> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRegeneratingHook, setIsRegeneratingHook] = useState(false);
  const [input, setInput] = useState('');
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const systemLogRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<ReturnType<typeof createSidebarChat> | null>(null);

  const selectedLead = activeFocus?.leads?.find((l) => l.id === selectedLeadId) ?? null;

  const pushLog = (line: string) => {
    setSystemLog((prev) => [...prev.slice(-(MAX_SYSTEM_LOG_LINES - 1)), line]);
  };

  useEffect(() => {
    chatRef.current = createSidebarChat(activeFocus ?? null, selectedLead ?? null);
  }, [activeFocus, selectedLead]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    systemLogRef.current?.scrollTo({ top: systemLogRef.current.scrollHeight, behavior: 'smooth' });
  }, [systemLog.length]);

  useEffect(() => {
    if (!modeMenuOpen) return;
    const handle = (e: MouseEvent) => {
      if (modeMenuRef.current?.contains(e.target as Node)) return;
      setModeMenuOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [modeMenuOpen]);

  const [isLoading, setIsLoading] = useState(false);
  const [isDeepResearching, setIsDeepResearching] = useState(false);

  const handleAnalyzeStructure = async () => {
    const focusId = templateModalFocusId;
    if (!focusId || isAnalyzing) return;
    const focus = getFocus(focusId);
    if (!focus?.templateBricks) return;
    setIsAnalyzing(true);
    setLastSuggestedBricks(null);
    pushLog('> Analyzing template...');
    try {
      const result = await analyzeTemplateStructure(
        focus.templateBricks,
        focus.templateType ?? 'sponsorship'
      );
      setLastSuggestedBricks(result.suggestedBricks ?? null);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'agent',
          text: result.suggestions,
          actions: result.suggestedBricks
            ? [{ id: 'apply-template', label: 'Apply Changes', type: 'apply_template_changes' }]
            : undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'agent', text: 'Template analysis failed. Please try again.' },
      ]);
      pushLog('> Error.');
    } finally {
      setIsAnalyzing(false);
      pushLog('> Done.');
    }
  };

  const handleSaveToDraft = () => {
    if (!activeFocus || !selectedLead) return;
    const bricks = activeFocus.templateBricks;
    const greetingText =
      bricks?.greeting && selectedLead.leadName
        ? fillTemplate(bricks.greeting, { lead_name: selectedLead.leadName })
        : `Dear ${selectedLead.leadName},`;
    const credibility =
      bricks?.credibility ?? `We are ${profile.clubName}. We represent students and run events that reach the broader campus community.`;
    const meatForLead = selectedLead.meatOverride ?? getMeatFromFocus(activeFocus);
    const cta = selectedLead.cta ?? bricks?.cta ?? 'Would you be open to a short call?';
    const fullDraft = [
      `To: ${selectedLead.contactEmail ?? ''}`,
      '',
      greetingText,
      '',
      selectedLead.hook?.trim() ?? '',
      '',
      credibility.trim(),
      '',
      meatForLead.trim(),
      '',
      cta.trim(),
      '',
      'Best,',
      '[Your name]',
    ].join('\n');
    const leads = activeFocus.leads ?? [];
    const updatedLeads = leads.map((l) =>
      l.id === selectedLead.id ? { ...l, draftText: fullDraft } : l
    );
    updateFocus(activeFocus.id, { leads: updatedLeads });
    setMessages((prev) => [
      ...prev,
      { id: `a-${Date.now()}`, role: 'agent', text: 'Draft saved.' },
    ]);
  };

  const handleInlineRegenerateHook = async () => {
    if (!selectedLead || isRegeneratingHook) return;
    setIsRegeneratingHook(true);
    pushLog('> Regenerating hook...');
    try {
      const hookInstructions = activeFocus?.templateBricks?.hookInstructions ?? '';
      const { hook } = await generateHook(
        selectedLead.companyName,
        profile.interests,
        hookInstructions,
        'professional'
      );
      pushHook(hook);
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'agent', text: 'Hook updated in the draft.' },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'agent', text: 'Failed to regenerate hook.' },
      ]);
    } finally {
      setIsRegeneratingHook(false);
      pushLog('> Done.');
    }
  };

  const handleApplyTemplateChanges = () => {
    if (!templateModalFocusId || !lastSuggestedBricks) return;
    const focus = getFocus(templateModalFocusId);
    const current = focus?.templateBricks;
    if (!current) return;
    const merged: FocusTemplateBricks = {
      ...current,
      ...lastSuggestedBricks,
    };
    applySuggestedBricks(merged);
    setMessages((prev) => [
      ...prev,
      { id: `a-${Date.now()}`, role: 'agent', text: 'Template updated. You can save from the modal.' },
    ]);
    setLastSuggestedBricks(null);
  };

  const handleDeepResearch = async () => {
    if (!selectedLead || isDeepResearching) return;
    setIsDeepResearching(true);
    pushLog(`> Deep research: ${selectedLead.companyName}...`);
    try {
      const bullets = await deepResearchLead(selectedLead, activeFocus?.name ?? undefined);
      const text = bullets.map((b) => `- ${b}`).join("\n");
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "agent",
          text: `Deep research: ${selectedLead.companyName}\n\n${text}`,
          actions: [
            { id: "regen-hook", label: "Regenerate Hook", type: "regenerate_hook" },
            { id: "save-draft", label: "Save to Draft", type: "save_to_draft" },
          ],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "agent", text: "Deep research failed. Please try again." },
      ]);
      pushLog('> Error.');
    } finally {
      setIsDeepResearching(false);
      pushLog('> Done.');
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || paused) return;
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text },
    ]);
    setInput('');
    setIsLoading(true);
    pushLog('> Sending...');
    try {
      const result = await chatRef.current?.sendMessage({ message: text });
      const responseText = result?.text ?? 'No response.';
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'agent', text: responseText },
      ]);
      pushLog('> Response received.');
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'agent', text: 'Connection error. Please try again.' },
      ]);
      pushLog('> Error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearContext = () => {
    setMessages([]);
    setSystemLog([]);
    setPaused(false);
  };

  const handleStubAction = (label: string) => () => {
    setMessages((prev) => [
      ...prev,
      { id: `a-${Date.now()}`, role: 'agent', text: `${label}: Not yet implemented. Use the chat for now.` },
    ]);
  };

  const isProcessing = isLoading || isDeepResearching || isAnalyzing || isRegeneratingHook;
  const modeLabel = paused ? 'AGENT: PAUSED' : `MODE: [ ${AGENT_MODE_LABELS[mode]} ]`;

  return (
    <div
      className={cn(
        'flex flex-col h-full w-full font-mono shrink-0 flex-[0_0_30%] min-w-0 border-l-2 transition-colors',
        isProcessing ? 'border-white border-dashed animate-pulse' : 'border-white border-solid',
        'bg-black text-white'
      )}
    >
      <header className="shrink-0 px-3 py-2 border-b border-white/30 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-mono uppercase text-white/80 truncate">
            {modeLabel}
          </p>
          <p className="text-[10px] font-mono uppercase text-white/60 truncate mt-0.5">
            {activeFocus?.name ?? 'No focus'}
          </p>
          <p className="text-xs font-mono text-white truncate">
            {selectedLead ? `${selectedLead.companyName} · ${selectedLead.leadName}` : 'No lead selected'}
          </p>
          <p className="text-[9px] font-mono uppercase text-white/60 mt-1">
            Model: Gemini 3 Pro
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-sm border border-white/30 text-white hover:bg-white/10 h-8 w-8"
            onClick={onToggle}
            aria-label="Collapse sidebar"
          >
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
          ref={scrollRef}
        >
          <div className="p-3 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'border p-3 rounded-sm',
                  msg.role === 'user'
                    ? 'bg-white text-black border-white/30'
                    : 'bg-white/10 border-white/30 text-white'
                )}
              >
                <p className="text-xs font-mono whitespace-pre-wrap">{msg.text}</p>
                {msg.role === 'agent' && msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.actions.map((a) => (
                      <Button
                        key={a.id}
                        variant="outline"
                        size="sm"
                        className="font-mono text-xs rounded-sm border-white text-white hover:bg-white/10"
                        onClick={() => {
                          if (a.type === 'apply_template_changes') handleApplyTemplateChanges();
                          if (a.type === 'regenerate_hook') handleInlineRegenerateHook();
                          if (a.type === 'save_to_draft') handleSaveToDraft();
                        }}
                      >
                        {a.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="border border-white/30 p-3 bg-white/10 text-white rounded-sm">
                <p className="text-xs font-mono text-white/70">Thinking...</p>
              </div>
            )}
          </div>
        </div>

        <div
          className="shrink-0 h-20 overflow-y-auto border-t border-white/20 px-3 py-2 bg-black"
          ref={systemLogRef}
        >
          <div className="text-[10px] font-mono text-white/60 space-y-0.5">
            {systemLog.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            {systemLog.length === 0 && (
              <div className="text-white/40">System log</div>
            )}
          </div>
        </div>
      </div>

      <footer className="shrink-0 p-3 border-t border-white/30 space-y-2">
        <div className="flex flex-wrap gap-1">
          {mode === 'discovery' && (
            <>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-white text-white hover:bg-white/10" onClick={handleStubAction('Identify Leads')}>
                [Identify Leads]
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-white text-white hover:bg-white/10" onClick={handleStubAction('Verify Contact')}>
                [Verify Contact]
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-white text-white hover:bg-white/10" onClick={handleStubAction('Score Leads')}>
                [Score Leads]
              </Button>
            </>
          )}
          {mode === 'research' && selectedLead && (
            <>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-white text-white hover:bg-white/10" onClick={handleDeepResearch} disabled={isDeepResearching}>
                {isDeepResearching ? "..." : "[Deep Research]"}
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-white text-white hover:bg-white/10" onClick={handleStubAction('Find Connection')}>
                [Find Connection]
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-white text-white hover:bg-white/10" onClick={handleInlineRegenerateHook} disabled={isRegeneratingHook}>
                {isRegeneratingHook ? "..." : "[Generate Hook]"}
              </Button>
            </>
          )}
          {mode === 'drafting' && templateModalFocusId && (
            <>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-white text-white hover:bg-white/10" onClick={handleStubAction('Shorten/Expand')}>
                [Shorten/Expand]
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-white text-white hover:bg-white/10" onClick={handleStubAction('Change Tone')}>
                [Change Tone]
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-white text-white hover:bg-white/10" onClick={handleAnalyzeStructure} disabled={isAnalyzing}>
                {isAnalyzing ? "..." : "[Check Logic]"}
              </Button>
            </>
          )}
          {mode === 'strategy' && (
            <>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-white text-white hover:bg-white/10" onClick={handleStubAction('Analyze Drive')}>
                [Analyze Drive]
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-white text-white hover:bg-white/10" onClick={handleStubAction('Map Mission')}>
                [Map Mission]
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-white text-white hover:bg-white/10" onClick={handleStubAction('Suggest Goal')}>
                [Suggest Goal]
              </Button>
            </>
          )}
        </div>
        <div className="relative" ref={modeMenuRef}>
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs rounded-sm border-white text-white hover:bg-white/10 w-full justify-between"
            onClick={() => setModeMenuOpen((o) => !o)}
          >
            <span>Mode: {modeOverride ? AGENT_MODE_LABELS[mode] + ' (override)' : 'Auto'}</span>
            <span aria-hidden>▾</span>
          </Button>
          {modeMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 py-1 rounded-sm border border-white/30 bg-black z-10">
              <button
                type="button"
                className={cn(
                  'w-full px-3 py-2 text-left text-xs font-mono',
                  !modeOverride ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'
                )}
                onClick={() => { setModeOverride(null); setModeMenuOpen(false); }}
              >
                Auto
              </button>
              {AGENT_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={cn(
                    'w-full px-3 py-2 text-left text-xs font-mono',
                    modeOverride === m ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'
                  )}
                  onClick={() => { setModeOverride(m); setModeMenuOpen(false); }}
                >
                  {AGENT_MODE_LABELS[m]}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs rounded-sm border-white text-white hover:bg-white/10 flex-1"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? '[Resume Agent]' : '[Pause Agent]'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs rounded-sm border-white text-white hover:bg-white/10"
            onClick={handleClearContext}
          >
            [Clear Context]
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            className="flex-1 font-mono text-sm rounded-sm bg-white/10 border-white/30 text-white placeholder:text-white/50"
            placeholder="Message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={paused}
          />
          <Button
            size="sm"
            className="font-mono rounded-sm bg-white text-black hover:bg-white/90 border-0"
            onClick={handleSend}
            disabled={!input.trim() || isLoading || paused}
          >
            {isLoading ? '...' : 'Send'}
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default AgentSidebar;
