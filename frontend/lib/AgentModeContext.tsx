import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelectedLead } from '@/lib/SelectedLeadContext';
import { useTemplateModal } from '@/lib/TemplateModalContext';
import type { AgentMode } from '@/types';

function computeAutoMode(
  pathname: string,
  selectedLeadId: string | null,
  templateModalFocusId: string | null
): AgentMode {
  if (templateModalFocusId != null) return 'drafting';
  if (pathname === '/objectives') return 'strategy';
  if ((pathname === '/sponsors' || pathname === '/clubs') && selectedLeadId) return 'research';
  if (pathname === '/sponsors' || pathname === '/clubs') return 'discovery';
  return 'discovery';
}

type AgentModeContextValue = {
  mode: AgentMode;
  modeOverride: AgentMode | null;
  setModeOverride: (mode: AgentMode | null) => void;
};

const AgentModeContext = createContext<AgentModeContextValue | null>(null);

export function AgentModeProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { selectedLeadId } = useSelectedLead();
  const { templateModalFocusId } = useTemplateModal();
  const [modeOverride, setModeOverrideState] = useState<AgentMode | null>(null);

  const autoMode = useMemo(
    () => computeAutoMode(location.pathname, selectedLeadId, templateModalFocusId),
    [location.pathname, selectedLeadId, templateModalFocusId]
  );

  const mode = modeOverride ?? autoMode;

  const setModeOverride = useCallback((m: AgentMode | null) => {
    setModeOverrideState(m);
  }, []);

  const value = useMemo(
    () => ({ mode, modeOverride, setModeOverride }),
    [mode, modeOverride, setModeOverride]
  );

  return (
    <AgentModeContext.Provider value={value}>
      {children}
    </AgentModeContext.Provider>
  );
}

export function useAgentMode(): AgentModeContextValue {
  const ctx = useContext(AgentModeContext);
  if (!ctx) throw new Error('useAgentMode must be used within AgentModeProvider');
  return ctx;
}
