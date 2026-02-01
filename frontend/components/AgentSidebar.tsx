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
import { parseFunctionCallsFromText } from '@/lib/parseFunctionCalls';
import { createLLMChat } from '@/services/llmProvider';
import { executeAgentFunction } from '@/services/agentFunctions';
import { deepResearchLead, analyzeTemplateStructure, generateHook } from '@/services/geminiService';
import FunctionExecutionModal, { type ExecutionStatus } from '@/components/FunctionExecutionModal';
import type { FocusTemplateBricks, AgentMode, LLMMessage } from '@/types';
import { AGENT_MODE_LABELS, AGENT_MODE_DESCRIPTIONS } from '@/types';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [messages, setMessages] = useState<SidebarMessage[]>([]);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [systemLog, setSystemLog] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const [lastSuggestedBricks, setLastSuggestedBricks] = useState<Partial<FocusTemplateBricks> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRegeneratingHook, setIsRegeneratingHook] = useState(false);
  const [input, setInput] = useState('');
  const [executionModal, setExecutionModal] = useState<{
    isOpen: boolean;
    functionName: string | null;
    functionArgs: Record<string, any> | null;
    status: ExecutionStatus;
    resultMessage?: string;
  }>({
    isOpen: false,
    functionName: null,
    functionArgs: null,
    status: 'idle',
  });
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const systemLogRef = useRef<HTMLDivElement>(null);

  const selectedLead = activeFocus?.leads?.find((l) => l.id === selectedLeadId) ?? null;

  const pushLog = (line: string) => {
    setSystemLog((prev) => [...prev.slice(-(MAX_SYSTEM_LOG_LINES - 1)), line]);
  };

  // Initialize with connection status
  useEffect(() => {
    pushLog('> Groq LLM: llama-3.1-8b-instant');
    pushLog('> Function calling enabled');
    pushLog('> Ready');
  }, []);

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
      // Convert messages to LLM format
      const llmMessages: LLMMessage[] = messages.map(m => ({
        role: m.role === 'agent' ? 'assistant' : 'user',
        content: m.text
      }));
      llmMessages.push({ role: 'user', content: text });

      const result = await createLLMChat({
        messages: llmMessages,
        context: {
          activeFocus: activeFocus ?? null,
          selectedLead: selectedLead ?? null,
          clubProfile: profile
        },
        functions: true,
        useSDK: false // Use fetch by default
      });

      // Check for proper function call OR parse from text (fallback)
      let functionCall = result.functionCall;
      let displayText = result.text;

      if (!functionCall && result.text) {
        // Try to parse function calls from the text (fallback for malformed responses)
        const parsed = parseFunctionCallsFromText(result.text);
        if (parsed.functionCalls.length > 0) {
          functionCall = parsed.functionCalls[0];
          displayText = parsed.cleanText;
          pushLog('> Parsed function from text');
        }
      }

      // If we have a function call (from API or parsed), execute it with modal
      if (functionCall) {
        pushLog(`> Executing: ${functionCall.name}`);
        
        // Open modal with executing state
        setExecutionModal({
          isOpen: true,
          functionName: functionCall.name,
          functionArgs: functionCall.arguments,
          status: 'executing',
        });

        const execution = await executeAgentFunction(
          functionCall.name,
          functionCall.arguments,
          { activeFocus, selectedLead, clubProfile: profile }
        );

        // Update modal with result
        setExecutionModal(prev => ({
          ...prev,
          status: execution.success ? 'success' : 'error',
          resultMessage: execution.message,
        }));
        
        const actions: Array<{ id: string; label: string; type: string }> = [];
        if (execution.success && execution.navigateTo) {
          actions.push({ id: 'view-agents', label: 'View in Agents Tab', type: 'navigate_agents' });
        }

        setMessages((prev) => [...prev, {
          id: `a-${Date.now()}`,
          role: 'agent',
          text: execution.message,
          actions: actions.length > 0 ? actions : undefined
        }]);
        pushLog('> Done.');
      } else if (displayText) {
        // Regular text response (show cleaned text if we removed failed function parsing)
        setMessages((prev) => [...prev, {
          id: `a-${Date.now()}`,
          role: 'agent',
          text: displayText
        }]);
        pushLog('> Response received.');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Connection error';
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: 'agent',
        text: `⚠ ${errorMsg}`
      }]);
      // Close modal with error if it was open
      setExecutionModal(prev => 
        prev.isOpen ? { ...prev, status: 'error', resultMessage: errorMsg } : prev
      );
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
        isProcessing ? 'border-neutral-400 border-dashed animate-pulse' : 'border-neutral-300 border-solid',
        'bg-white text-neutral-900 shadow-[-4px_0_12px_rgba(0,0,0,0.06)]'
      )}
    >
      <header className="shrink-0 px-3 py-2 border-b border-neutral-200 flex items-center justify-between gap-2 bg-neutral-50/80">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-mono uppercase text-neutral-600 truncate">
            {modeLabel}
          </p>
          <p className="text-[10px] font-mono uppercase text-neutral-500 truncate mt-0.5">
            {activeFocus?.name ?? 'No focus'}
          </p>
          <p className="text-xs font-mono text-neutral-900 truncate">
            {selectedLead ? `${selectedLead.companyName} · ${selectedLead.leadName}` : 'No lead selected'}
          </p>
          <p className="text-[9px] font-mono uppercase text-neutral-500 mt-1">
            Model: Groq llama-3.1-8b-instant
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-sm border border-neutral-200 text-neutral-600 hover:bg-neutral-100 h-8 w-8"
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
                    ? 'bg-neutral-100 border-neutral-200 text-neutral-900'
                    : 'bg-white border-neutral-200 text-neutral-800'
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
                        className="font-mono text-xs rounded-sm border-neutral-300 text-neutral-800 hover:bg-neutral-100"
                        onClick={() => {
                          if (a.type === 'apply_template_changes') handleApplyTemplateChanges();
                          if (a.type === 'regenerate_hook') handleInlineRegenerateHook();
                          if (a.type === 'save_to_draft') handleSaveToDraft();
                          if (a.type === 'navigate_agents') navigate('/agents');
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
              <div className="border border-neutral-200 p-3 bg-neutral-50 text-neutral-600 rounded-sm">
                <p className="text-xs font-mono">Thinking...</p>
              </div>
            )}
          </div>
        </div>

        <div
          className="shrink-0 h-20 overflow-y-auto border-t border-neutral-200 px-3 py-2 bg-neutral-50"
          ref={systemLogRef}
        >
          <div className="text-[10px] font-mono text-neutral-500 space-y-0.5">
            {systemLog.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            {systemLog.length === 0 && (
              <div className="text-neutral-400">System log</div>
            )}
          </div>
        </div>
      </div>

      <footer className="shrink-0 p-3 border-t border-neutral-200 space-y-2 bg-neutral-50/50">
        <div className="flex flex-wrap gap-1">
          {mode === 'discovery' && (
            <>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-neutral-300 text-neutral-800 hover:bg-neutral-100" onClick={handleStubAction('Identify Leads')}>
                [Identify Leads]
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-neutral-300 text-neutral-800 hover:bg-neutral-100" onClick={handleStubAction('Verify Contact')}>
                [Verify Contact]
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-neutral-300 text-neutral-800 hover:bg-neutral-100" onClick={handleStubAction('Score Leads')}>
                [Score Leads]
              </Button>
            </>
          )}
          {mode === 'research' && selectedLead && (
            <>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-neutral-300 text-neutral-800 hover:bg-neutral-100" onClick={handleDeepResearch} disabled={isDeepResearching}>
                {isDeepResearching ? "..." : "[Deep Research]"}
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-neutral-300 text-neutral-800 hover:bg-neutral-100" onClick={handleStubAction('Find Connection')}>
                [Find Connection]
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-neutral-300 text-neutral-800 hover:bg-neutral-100" onClick={handleInlineRegenerateHook} disabled={isRegeneratingHook}>
                {isRegeneratingHook ? "..." : "[Generate Hook]"}
              </Button>
            </>
          )}
          {mode === 'drafting' && templateModalFocusId && (
            <>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-neutral-300 text-neutral-800 hover:bg-neutral-100" onClick={handleStubAction('Shorten/Expand')}>
                [Shorten/Expand]
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-neutral-300 text-neutral-800 hover:bg-neutral-100" onClick={handleStubAction('Change Tone')}>
                [Change Tone]
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-neutral-300 text-neutral-800 hover:bg-neutral-100" onClick={handleAnalyzeStructure} disabled={isAnalyzing}>
                {isAnalyzing ? "..." : "[Check Logic]"}
              </Button>
            </>
          )}
          {mode === 'strategy' && (
            <>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-neutral-300 text-neutral-800 hover:bg-neutral-100" onClick={handleStubAction('Analyze Drive')}>
                [Analyze Drive]
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-neutral-300 text-neutral-800 hover:bg-neutral-100" onClick={handleStubAction('Map Mission')}>
                [Map Mission]
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-sm border-neutral-300 text-neutral-800 hover:bg-neutral-100" onClick={handleStubAction('Suggest Goal')}>
                [Suggest Goal]
              </Button>
            </>
          )}
        </div>
        <div className="relative" ref={modeMenuRef}>
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs rounded-sm border-neutral-300 text-neutral-800 hover:bg-neutral-100 w-full justify-between bg-white"
            onClick={() => setModeMenuOpen((o) => !o)}
          >
            <span>Mode: {modeOverride ? AGENT_MODE_LABELS[mode] + ' (override)' : 'Auto'}</span>
            <span aria-hidden>▾</span>
          </Button>
          {modeMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 py-1 rounded-sm border border-neutral-200 bg-white shadow-lg z-10">
              <button
                type="button"
                className={cn(
                  'w-full px-3 py-2 text-left text-xs font-mono',
                  !modeOverride ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700 hover:bg-neutral-50'
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
                    modeOverride === m ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700 hover:bg-neutral-50'
                  )}
                  onClick={() => { setModeOverride(m); setModeMenuOpen(false); }}
                >
                  <span className="block">{AGENT_MODE_LABELS[m]}</span>
                  <span className="block text-[10px] text-neutral-500 font-normal mt-0.5">
                    {AGENT_MODE_DESCRIPTIONS[m]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs rounded-sm border-neutral-300 text-neutral-800 hover:bg-neutral-100 flex-1"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? '[Resume Agent]' : '[Pause Agent]'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs rounded-sm border-neutral-300 text-neutral-800 hover:bg-neutral-100"
            onClick={handleClearContext}
          >
            [Clear Context]
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            className="flex-1 font-mono text-sm rounded-sm bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-500"
            placeholder="Message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={paused}
          />
          <Button
            size="sm"
            className="font-mono rounded-sm bg-neutral-900 text-white hover:bg-neutral-800 border-0"
            onClick={handleSend}
            disabled={!input.trim() || isLoading || paused}
          >
            {isLoading ? '...' : 'Send'}
          </Button>
        </div>
      </footer>

      {/* Function Execution Modal */}
      <FunctionExecutionModal
        isOpen={executionModal.isOpen}
        functionName={executionModal.functionName}
        functionArgs={executionModal.functionArgs}
        status={executionModal.status}
        resultMessage={executionModal.resultMessage}
        onClose={() => setExecutionModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default AgentSidebar;
