import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useFocus } from '@/lib/FocusContext';
import { useSelectedLead } from '@/lib/SelectedLeadContext';
import { getMeatFromFocus } from '@/lib/templateUtils';

type AgentBridgeContextValue = {
  pushHook: (value: string) => void;
  pushMeat: (value: string) => void;
  pushCredibility: (value: string) => void;
  pushCta: (value: string) => void;
  pushGreeting: (value: string) => void;
};

const AgentBridgeContext = createContext<AgentBridgeContextValue | null>(null);

export function AgentBridgeProvider({ children }: { children: React.ReactNode }) {
  const { activeFocus, updateFocus } = useFocus();
  const { selectedLeadId } = useSelectedLead();

  const pushHook = useCallback(
    (value: string) => {
      if (!activeFocus || !selectedLeadId) return;
      const leads = activeFocus.leads ?? [];
      const updatedLeads = leads.map((l) =>
        l.id === selectedLeadId ? { ...l, hook: value } : l
      );
      updateFocus(activeFocus.id, { leads: updatedLeads });
    },
    [activeFocus, selectedLeadId, updateFocus]
  );

  const pushMeat = useCallback(
    (value: string) => {
      if (!activeFocus || !selectedLeadId) return;
      const meatFromFocusVal = getMeatFromFocus(activeFocus);
      const leads = activeFocus.leads ?? [];
      const updatedLeads = leads.map((l) =>
        l.id === selectedLeadId
          ? { ...l, meatOverride: value === meatFromFocusVal ? undefined : value }
          : l
      );
      updateFocus(activeFocus.id, { leads: updatedLeads });
    },
    [activeFocus, selectedLeadId, updateFocus]
  );

  const pushCredibility = useCallback(
    (value: string) => {
      if (!activeFocus?.templateBricks) return;
      updateFocus(activeFocus.id, {
        templateBricks: { ...activeFocus.templateBricks, credibility: value },
      });
    },
    [activeFocus, updateFocus]
  );

  const pushCta = useCallback(
    (value: string) => {
      if (!activeFocus || !selectedLeadId) return;
      const leads = activeFocus.leads ?? [];
      const updatedLeads = leads.map((l) =>
        l.id === selectedLeadId ? { ...l, cta: value } : l
      );
      updateFocus(activeFocus.id, { leads: updatedLeads });
    },
    [activeFocus, selectedLeadId, updateFocus]
  );

  const pushGreeting = useCallback(
    (value: string) => {
      if (!activeFocus?.templateBricks) return;
      updateFocus(activeFocus.id, {
        templateBricks: { ...activeFocus.templateBricks, greeting: value },
      });
    },
    [activeFocus, updateFocus]
  );

  const value = useMemo(
    () => ({ pushHook, pushMeat, pushCredibility, pushCta, pushGreeting }),
    [pushHook, pushMeat, pushCredibility, pushCta, pushGreeting]
  );

  return (
    <AgentBridgeContext.Provider value={value}>
      {children}
    </AgentBridgeContext.Provider>
  );
}

export function useAgentBridge(): AgentBridgeContextValue {
  const ctx = useContext(AgentBridgeContext);
  if (!ctx) throw new Error('useAgentBridge must be used within AgentBridgeProvider');
  return ctx;
}
