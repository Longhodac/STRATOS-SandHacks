import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFocus } from '@/lib/FocusContext';
import { useSelectedLead } from '@/lib/SelectedLeadContext';
import { useAgentSidebar } from '@/lib/AgentSidebarContext';
import { useClubProfile } from '@/lib/ClubProfileContext';
import { parseFunctionCallsFromText } from '@/lib/parseFunctionCalls';
import { createLLMChat } from '@/services/llmProvider';
import { executeAgentFunction } from '@/services/agentFunctions';
import FunctionExecutionModal, { type ExecutionStatus } from '@/components/FunctionExecutionModal';
import type { LLMMessage, LLMToolCall } from '@/types';
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
const MAX_AGENT_ITERATIONS = 5;

const AgentSidebar: React.FC<AgentSidebarProps> = ({ onToggle }) => {
  const { activeFocus, updateFocus, focuses, setActiveFocus } = useFocus();
  const { selectedLeadId } = useSelectedLead();
  const { pendingMessage, clearPendingMessage } = useAgentSidebar();
  const { profile } = useClubProfile();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<SidebarMessage[]>([]);
  const [systemLog, setSystemLog] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [executionModal, setExecutionModal] = useState<{
    isOpen: boolean;
    functionName: string | null;
    functionArgs: Record<string, any> | null;
    status: ExecutionStatus;
    resultMessage?: string;
    currentIndex?: number;
    totalCount?: number;
  }>({
    isOpen: false,
    functionName: null,
    functionArgs: null,
    status: 'idle',
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const systemLogRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedLead = activeFocus?.leads?.find((l) => l.id === selectedLeadId) ?? null;

  const pushLog = (line: string) => {
    setSystemLog((prev) => [...prev.slice(-(MAX_SYSTEM_LOG_LINES - 1)), line]);
  };

  // Initialize with connection status and API key check
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    pushLog('> Groq LLM: llama-3.1-8b-instant');
    pushLog('> Function calling enabled');
    if (!apiKey) {
      pushLog('> ⚠ ERROR: VITE_GROQ_API_KEY not configured in .env.local');
    } else {
      pushLog('> Ready');
    }
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, [messages.length]);

  useEffect(() => {
    systemLogRef.current?.scrollTo({ top: systemLogRef.current.scrollHeight, behavior: 'smooth' });
  }, [systemLog.length]);

  // Ref so pending-message effect can call latest handleSend without it in deps
  const handleSendRef = useRef<(messageOverride?: string) => void>(() => {});

  // Handle pending messages from other components (e.g., Match Missions button)
  useEffect(() => {
    if (pendingMessage && !isLoading) {
      const msg = pendingMessage;
      clearPendingMessage();
      handleSendRef.current(msg);
    }
  }, [pendingMessage, isLoading, clearPendingMessage]);

  const handleSend = useCallback(async (messageOverride?: string) => {
    const text = (messageOverride !== undefined && messageOverride !== '') ? messageOverride : input.trim();
    if (!text || isLoading) return;
    const userMsgId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', text },
    ]);
    if (messageOverride === undefined) setInput('');
    setIsLoading(true);
    pushLog('> Sending...');
    try {
      // Build initial LLM messages from conversation + this message
      let llmMessages: LLMMessage[] = [
        ...messages.map(m => ({
          role: (m.role === 'agent' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.text
        })),
        { role: 'user' as const, content: text }
      ];

      const context = {
        activeFocus: activeFocus ?? null,
        selectedLead: selectedLead ?? null,
        clubProfile: profile,
        focuses,
        updateFocus,
        setActiveFocus,
      };

      let lastNavigateTo: string | undefined;
      let iteration = 0;

      // Agent loop: chain tool calls until text-only response or max iterations
      while (iteration < MAX_AGENT_ITERATIONS) {
        iteration++;
        const result = await createLLMChat({
          messages: llmMessages,
          context,
          functions: true,
          useSDK: false
        });

        // Prefer functionCalls (multi-call) over single functionCall
        const functionCalls = result.functionCalls ?? (result.functionCall ? [result.functionCall] : []);
        let toolCallIds = result.toolCallIds ?? [];
        while (toolCallIds.length < functionCalls.length) {
          toolCallIds = [...toolCallIds, `call_${toolCallIds.length}`];
        }

        // Fallback: parse from text if API didn't return structured tool calls
        let displayText = result.text;
        let callsToExecute = functionCalls;
        let idsToUse = toolCallIds;

        if (callsToExecute.length === 0 && result.text) {
          const parsed = parseFunctionCallsFromText(result.text);
          if (parsed.functionCalls.length > 0) {
            callsToExecute = parsed.functionCalls;
            displayText = parsed.cleanText;
            idsToUse = callsToExecute.map((_, i) => `call_fallback_${i}`);
            pushLog('> Parsed function(s) from text');
          }
        }

        if (callsToExecute.length === 0) {
          // Text-only response - done
          if (displayText) {
            setMessages((prev) => [...prev, {
              id: crypto.randomUUID(),
              role: 'agent',
              text: displayText
            }]);
          }
          pushLog('> Response received.');
          break;
        }

        // Execute all tool calls sequentially
        pushLog(`> Executing ${callsToExecute.length} function(s)...`);

        const toolResults: Array<{ id: string; content: string }> = [];
        const executionMessages: string[] = [];
        let hasError = false;

        for (let i = 0; i < callsToExecute.length; i++) {
          const fc = callsToExecute[i];
          const toolId = idsToUse[i] ?? `call_${i}`;

          setExecutionModal({
            isOpen: true,
            functionName: fc.name,
            functionArgs: fc.arguments,
            status: 'executing',
            currentIndex: i + 1,
            totalCount: callsToExecute.length,
          });

          const execution = await executeAgentFunction(fc.name, fc.arguments, context);

          toolResults.push({
            id: toolId,
            content: JSON.stringify({
              success: execution.success,
              message: execution.message,
              result: execution.result,
            }),
          });
          executionMessages.push(execution.message);
          if (execution.navigateTo) lastNavigateTo = execution.navigateTo;
          if (!execution.success) hasError = true;
        }

        setExecutionModal(prev => ({
          ...prev,
          status: hasError ? 'error' : 'success',
          resultMessage: executionMessages.join('\n\n'),
        }));

        // Build assistant message with tool_calls for chaining
        const toolCallsForAssistant: LLMToolCall[] = callsToExecute.map((fc, i) => ({
          id: idsToUse[i] ?? `call_${i}`,
          type: 'function',
          function: { name: fc.name, arguments: JSON.stringify(fc.arguments) },
        }));

        llmMessages = [
          ...llmMessages,
          {
            role: 'assistant' as const,
            content: result.text || '',
            tool_calls: toolCallsForAssistant,
          },
          ...toolResults.map(tr => ({
            role: 'tool' as const,
            tool_call_id: tr.id,
            content: tr.content,
          })),
        ];

        // Add user-facing message for this round of executions
        const combinedMessage = executionMessages.join('\n\n');
        const actions: Array<{ id: string; label: string; type: string }> = [];
        if (lastNavigateTo && !hasError) {
          const navLabel = lastNavigateTo === '/agents' ? 'View in Agents Tab'
            : lastNavigateTo === '/sponsors' ? 'View in Sponsors Tab'
            : lastNavigateTo === '/clubs' ? 'View in Clubs Tab'
            : 'View Result';
          actions.push({ id: 'view-result', label: navLabel, type: 'navigate', route: lastNavigateTo } as any);
        }

        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(),
          role: 'agent',
          text: combinedMessage,
          actions: actions.length > 0 ? actions : undefined
        }]);

        pushLog('> Tool results sent, continuing...');
      }

      if (iteration >= MAX_AGENT_ITERATIONS) {
        pushLog('> Max iterations reached.');
      }

      // Auto-navigate after successful execution
      if (lastNavigateTo) {
        setTimeout(() => navigate(lastNavigateTo!), 1500);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Connection error';
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'agent',
        text: `⚠ ${errorMsg}`
      }]);
      setExecutionModal(prev =>
        prev.isOpen ? { ...prev, status: 'error', resultMessage: errorMsg } : prev
      );
      pushLog('> Error.');
    } finally {
      setIsLoading(false);
    }
  }, [messages, activeFocus, selectedLead, profile, focuses, updateFocus, setActiveFocus, navigate, isLoading, input]);

  handleSendRef.current = handleSend;

  const closeExecutionModal = useCallback(() => {
    setExecutionModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const isProcessing = isLoading;

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
            Agent
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
                          if (a.type === 'navigate_agents') navigate('/agents');
                          if (a.type === 'navigate' && (a as any).route) navigate((a as any).route);
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

      <footer className="shrink-0 p-3 border-t border-neutral-200 bg-neutral-50/50">
        <div className="flex gap-2">
          <Input
            className="flex-1 font-mono text-sm rounded-sm bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-500"
            placeholder="Message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            size="sm"
            className="font-mono rounded-sm bg-neutral-900 text-white hover:bg-neutral-800 border-0"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            data-agent-submit
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
        currentIndex={executionModal.currentIndex}
        totalCount={executionModal.totalCount}
        onClose={closeExecutionModal}
      />
    </div>
  );
};

export default AgentSidebar;
