import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useFocus } from '@/lib/FocusContext';
import { Button } from '@/components/ui/button';
import TemplateBricksEditor from '@/components/TemplateBricksEditor';
import { getDefaultTemplateBricks } from '@/lib/templateUtils';
import { cn } from '@/lib/utils';
import type { FocusTemplateBricks } from '@/types';

const MODAL_ROOT_ID = 'modal-root';

type TemplateEditModalProps = {
  open: boolean;
  onClose: () => void;
  focusId: string | null;
};

const TemplateEditModal: React.FC<TemplateEditModalProps> = ({ open, onClose, focusId }) => {
  const { getFocus, updateFocus, getAttachmentFiles, setAttachmentFiles } = useFocus();
  const focus = focusId ? getFocus(focusId) : null;
  const [bricks, setBricks] = useState<FocusTemplateBricks>(getDefaultTemplateBricks('sponsorship'));
  const attachmentFiles = focusId ? getAttachmentFiles(focusId) : [];

  useEffect(() => {
    if (!open || !focus) return;
    setBricks(focus.templateBricks ?? getDefaultTemplateBricks(focus.templateType ?? 'sponsorship'));
  }, [open, focusId, focus?.templateBricks, focus?.templateType]);

  const handleSave = useCallback(() => {
    if (!focusId || !focus) return;
    const updatedLeads = focus.leads.map((lead) => ({
      ...lead,
      cta: undefined,
      meatOverride: undefined,
    }));
    updateFocus(focusId, { templateBricks: bricks, leads: updatedLeads });
    onClose();
  }, [focusId, focus, bricks, updateFocus, onClose]);

  if (!open) return null;

  const modalRoot = typeof document !== 'undefined' ? document.getElementById(MODAL_ROOT_ID) : null;
  if (!modalRoot) return null;

  const modal = (
    <div
      className="flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0,0,0,0.75)',
        minWidth: '100vw',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-modal-title"
    >
      <div
        className={cn(
          'w-full max-w-2xl rounded-sm max-h-[90vh] flex flex-col overflow-hidden',
          'border border-neutral-200 shadow-2xl'
        )}
        style={{
          backgroundColor: '#ffffff',
          color: '#111111',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-neutral-200 px-6 py-4 shrink-0">
          <h2 id="template-modal-title" className="text-sm font-mono uppercase tracking-wide font-semibold">
            Edit General Template — {focus?.name ?? 'Focus'}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <TemplateBricksEditor
            bricks={bricks}
            onChange={setBricks}
            attachmentFiles={attachmentFiles}
            onAttachmentFilesChange={focusId ? (files) => setAttachmentFiles(focusId, files) : undefined}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-neutral-200 px-6 py-4 shrink-0">
          <Button variant="outline" size="sm" className="font-mono" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" className="font-mono bg-black text-white hover:bg-black/90" onClick={handleSave}>
            Save Template
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, modalRoot);
};

export default TemplateEditModal;
