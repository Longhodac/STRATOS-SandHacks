import React, { createContext, useContext } from 'react';

type TemplateModalContextValue = {
  openTemplateModal: (focusId: string) => void;
};

const TemplateModalContext = createContext<TemplateModalContextValue | null>(null);

export function TemplateModalProvider({
  children,
  openTemplateModal,
}: {
  children: React.ReactNode;
  openTemplateModal: (focusId: string) => void;
}) {
  const value = React.useMemo(() => ({ openTemplateModal }), [openTemplateModal]);
  return (
    <TemplateModalContext.Provider value={value}>
      {children}
    </TemplateModalContext.Provider>
  );
}

export function useTemplateModal(): TemplateModalContextValue {
  const ctx = useContext(TemplateModalContext);
  if (!ctx) throw new Error('useTemplateModal must be used within TemplateModalProvider');
  return ctx;
}
