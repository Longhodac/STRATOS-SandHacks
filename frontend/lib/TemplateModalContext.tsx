import React, { createContext, useContext, useRef, useCallback, useMemo } from 'react';
import type { FocusTemplateBricks } from '@/types';

type TemplateModalContextValue = {
  openTemplateModal: (focusId: string) => void;
  templateModalFocusId: string | null;
  registerTemplateEditor: (apply: ((bricks: FocusTemplateBricks) => void) | null) => void;
  applySuggestedBricks: (bricks: FocusTemplateBricks) => void;
};

const TemplateModalContext = createContext<TemplateModalContextValue | null>(null);

export function TemplateModalProvider({
  children,
  openTemplateModal,
  templateModalFocusId,
}: {
  children: React.ReactNode;
  openTemplateModal: (focusId: string) => void;
  templateModalFocusId: string | null;
}) {
  const editorApplyRef = useRef<((bricks: FocusTemplateBricks) => void) | null>(null);

  const registerTemplateEditor = useCallback((apply: ((bricks: FocusTemplateBricks) => void) | null) => {
    editorApplyRef.current = apply;
  }, []);

  const applySuggestedBricks = useCallback((bricks: FocusTemplateBricks) => {
    editorApplyRef.current?.(bricks);
  }, []);

  const value = useMemo(
    () => ({
      openTemplateModal,
      templateModalFocusId,
      registerTemplateEditor,
      applySuggestedBricks,
    }),
    [openTemplateModal, templateModalFocusId, registerTemplateEditor, applySuggestedBricks]
  );

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
