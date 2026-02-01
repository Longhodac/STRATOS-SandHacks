import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

type AgentSidebarContextValue = {
  sidebarOpen: boolean;
  pendingMessage: string | null;
  sendAgentMessage: (message: string) => void;
  clearPendingMessage: () => void;
};

const AgentSidebarContext = createContext<AgentSidebarContextValue | null>(null);

export function AgentSidebarProvider({
  children,
  sidebarOpen,
}: {
  children: React.ReactNode;
  sidebarOpen: boolean;
}) {
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const sendAgentMessage = useCallback((message: string) => {
    setPendingMessage(message);
  }, []);

  const clearPendingMessage = useCallback(() => {
    setPendingMessage(null);
  }, []);

  const value = useMemo(
    () => ({ sidebarOpen, pendingMessage, sendAgentMessage, clearPendingMessage }),
    [sidebarOpen, pendingMessage, sendAgentMessage, clearPendingMessage]
  );

  return (
    <AgentSidebarContext.Provider value={value}>
      {children}
    </AgentSidebarContext.Provider>
  );
}

export function useAgentSidebar(): AgentSidebarContextValue {
  const ctx = useContext(AgentSidebarContext);
  if (!ctx) throw new Error('useAgentSidebar must be used within AgentSidebarProvider');
  return ctx;
}
