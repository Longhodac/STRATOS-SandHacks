import React, { createContext, useContext, useMemo, useState } from 'react';

type SelectedLeadContextValue = {
  selectedLeadId: string | null;
  setSelectedLeadId: (id: string | null) => void;
};

const SelectedLeadContext = createContext<SelectedLeadContextValue | null>(null);

export function SelectedLeadProvider({ children }: { children: React.ReactNode }) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const value = useMemo(
    () => ({ selectedLeadId, setSelectedLeadId }),
    [selectedLeadId]
  );
  return (
    <SelectedLeadContext.Provider value={value}>
      {children}
    </SelectedLeadContext.Provider>
  );
}

export function useSelectedLead(): SelectedLeadContextValue {
  const ctx = useContext(SelectedLeadContext);
  if (!ctx) throw new Error('useSelectedLead must be used within SelectedLeadProvider');
  return ctx;
}
