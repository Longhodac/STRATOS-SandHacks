import React, { createContext, useContext } from 'react';

type FocusModalContextValue = {
  openFocusModal: (focusId: string | null) => void;
};

const FocusModalContext = createContext<FocusModalContextValue | null>(null);

export function FocusModalProvider({
  children,
  openFocusModal,
}: {
  children: React.ReactNode;
  openFocusModal: (focusId: string | null) => void;
}) {
  const value = React.useMemo(() => ({ openFocusModal }), [openFocusModal]);
  return (
    <FocusModalContext.Provider value={value}>{children}</FocusModalContext.Provider>
  );
}

export function useFocusModal(): FocusModalContextValue {
  const ctx = useContext(FocusModalContext);
  if (!ctx) throw new Error('useFocusModal must be used within FocusModalProvider');
  return ctx;
}
