import React, { createContext, useContext, useMemo } from 'react';

type AgentSidebarContextValue = {
  sidebarOpen: boolean;
};

const AgentSidebarContext = createContext<AgentSidebarContextValue | null>(null);

export function AgentSidebarProvider({
  children,
  sidebarOpen,
}: {
  children: React.ReactNode;
  sidebarOpen: boolean;
}) {
  const value = useMemo(() => ({ sidebarOpen }), [sidebarOpen]);
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
