import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useFocus } from '@/lib/FocusContext';
import { useClubProfile } from '@/lib/ClubProfileContext';
import { useTemplateModal } from '@/lib/TemplateModalContext';
import { generateHook, generateAllHooks } from '@/services/geminiService';
import { getMeatFromFocus, fillTemplate } from '@/lib/templateUtils';
import { formatFileSize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import FocusSwitcher from '@/components/FocusSwitcher';
import AIHookBlock from '@/components/AIHookBlock';
import { cn } from '@/lib/utils';
import type { HookTone } from '@/types';

const MODAL_ROOT_ID = 'modal-root';

const TONE_BUTTONS: { tone: HookTone; label: string }[] = [
  { tone: 'professional', label: 'Professional' },
  { tone: 'short_punchy', label: 'Short/Punchy' },
  { tone: 'student_to_recruiter', label: 'Student-to-Recruiter' },
];

const Sponsors: React.FC = () => {
  const navigate = useNavigate();
  const { activeFocus, updateFocus, getAttachmentFiles, getLeadAttachmentFiles, setLeadAttachmentFiles } = useFocus();
  const { profile } = useClubProfile();
  const { openTemplateModal } = useTemplateModal();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isGeneratingHook, setIsGeneratingHook] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const leadFileInputRef = useRef<HTMLInputElement>(null);

  const leads = activeFocus?.leads ?? [];
  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? leads[0] ?? null;

  useEffect(() => {
    if (leads.length > 0 && (!selectedLeadId || !leads.some((l) => l.id === selectedLeadId))) {
      setSelectedLeadId(leads[0].id);
    } else if (leads.length === 0) {
      setSelectedLeadId(null);
    }
  }, [leads, selectedLeadId]);
  const bricks = activeFocus?.templateBricks;
  const credibility = bricks?.credibility ?? `We are ${profile.clubName}. We represent students and run events that reach the broader campus community.`;
  const meatFromFocus = activeFocus ? getMeatFromFocus(activeFocus) : '';
  const meatForLead = selectedLead?.meatOverride ?? meatFromFocus;
  const templateCta = bricks?.cta ?? 'Would you be open to a short call?';
  const leadCta = selectedLead?.cta ?? templateCta;
  const hookInstructions = bricks?.hookInstructions ?? '';

  const handleGenerateHook = useCallback(async () => {
    if (!selectedLead || !activeFocus) return;
    setIsGeneratingHook(true);
    try {
      const { hook, reasoning } = await generateHook(
        selectedLead.companyName,
        profile.interests,
        hookInstructions,
        'professional'
      );
      const updatedLeads = leads.map((l) =>
        l.id === selectedLead.id ? { ...l, hook, hookReasoning: reasoning } : l
      );
      updateFocus(activeFocus.id, { leads: updatedLeads });
    } finally {
      setIsGeneratingHook(false);
    }
  }, [selectedLead, activeFocus, leads, profile.interests, hookInstructions, updateFocus]);

  const handleNewVariation = useCallback(async () => {
    if (!selectedLead || !activeFocus) return;
    setIsGeneratingHook(true);
    try {
      const { hook, reasoning } = await generateHook(
        selectedLead.companyName,
        profile.interests,
        hookInstructions,
        'professional'
      );
      const updatedLeads = leads.map((l) =>
        l.id === selectedLead.id ? { ...l, hook, hookReasoning: reasoning } : l
      );
      updateFocus(activeFocus.id, { leads: updatedLeads });
    } finally {
      setIsGeneratingHook(false);
    }
  }, [selectedLead, activeFocus, leads, profile.interests, hookInstructions, updateFocus]);

  const handleToneRewrite = useCallback(
    async (tone: HookTone) => {
      if (!selectedLead || !activeFocus) return;
      setIsGeneratingHook(true);
      try {
        const { hook, reasoning } = await generateHook(
          selectedLead.companyName,
          profile.interests,
          hookInstructions,
          tone
        );
        const updatedLeads = leads.map((l) =>
          l.id === selectedLead.id ? { ...l, hook, hookReasoning: reasoning } : l
        );
        updateFocus(activeFocus.id, { leads: updatedLeads });
      } finally {
        setIsGeneratingHook(false);
      }
    },
    [selectedLead, activeFocus, leads, profile.interests, hookInstructions, updateFocus]
  );

  const handleGenerateAllHooks = useCallback(async () => {
    if (!activeFocus || leads.length === 0) return;
    setIsGeneratingAll(true);
    try {
      const results = await generateAllHooks(leads, profile.interests, hookInstructions, 'professional');
      const byId = Object.fromEntries(results.map((r) => [r.leadId, r]));
      const updatedLeads = leads.map((l) => {
        const r = byId[l.id];
        return r ? { ...l, hook: r.hook, hookReasoning: r.reasoning } : l;
      });
      updateFocus(activeFocus.id, { leads: updatedLeads });
    } finally {
      setIsGeneratingAll(false);
    }
  }, [activeFocus, leads, profile.interests, hookInstructions, updateFocus]);

  const handleHookChange = useCallback(
    (value: string) => {
      if (!selectedLead || !activeFocus) return;
      const updatedLeads = leads.map((l) =>
        l.id === selectedLead.id ? { ...l, hook: value } : l
      );
      updateFocus(activeFocus.id, { leads: updatedLeads });
    },
    [selectedLead, activeFocus, leads, updateFocus]
  );

  const handleMeatChange = useCallback(
    (value: string) => {
      if (!selectedLead || !activeFocus) return;
      const meatFromFocusVal = activeFocus.templateBricks?.meat ?? getMeatFromFocus(activeFocus);
      const updatedLeads = leads.map((l) =>
        l.id === selectedLead.id ? { ...l, meatOverride: value === meatFromFocusVal ? undefined : value } : l
      );
      updateFocus(activeFocus.id, { leads: updatedLeads });
    },
    [selectedLead, activeFocus, leads, updateFocus]
  );

  const handleCtaChange = useCallback(
    (value: string) => {
      if (!selectedLead || !activeFocus) return;
      const updatedLeads = leads.map((l) =>
        l.id === selectedLead.id ? { ...l, cta: value } : l
      );
      updateFocus(activeFocus.id, { leads: updatedLeads });
    },
    [selectedLead, activeFocus, leads, updateFocus]
  );

  const handleEditGeneralTemplate = useCallback(() => {
    if (activeFocus) openTemplateModal(activeFocus.id);
  }, [activeFocus, openTemplateModal]);

  const greetingText = selectedLead && bricks?.greeting
    ? fillTemplate(bricks.greeting, { lead_name: selectedLead.leadName })
    : selectedLead
      ? `Dear ${selectedLead.leadName},`
      : '';

  const attachmentList = bricks?.attachments?.filter(Boolean) ?? [];
  const attachmentFiles = activeFocus ? getAttachmentFiles(activeFocus.id) : [];
  const leadAttachmentFiles =
    selectedLead && activeFocus ? getLeadAttachmentFiles(activeFocus.id, selectedLead.id) : [];

  const handleLeadFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedLead || !activeFocus || !e.target.files?.length) return;
      const files = e.target.files;
      const next: File[] = [...leadAttachmentFiles, ...Array.from<File>(files)];
      setLeadAttachmentFiles(activeFocus.id, selectedLead.id, next);
      e.target.value = '';
    },
    [selectedLead, activeFocus, leadAttachmentFiles, setLeadAttachmentFiles]
  );

  const removeLeadFile = useCallback(
    (index: number) => {
      if (!selectedLead || !activeFocus) return;
      const next = leadAttachmentFiles.filter((_, i) => i !== index);
      setLeadAttachmentFiles(activeFocus.id, selectedLead.id, next);
    },
    [selectedLead, activeFocus, leadAttachmentFiles, setLeadAttachmentFiles]
  );

  const allAttachmentNames = [
    ...attachmentList,
    ...attachmentFiles.map((f) => f.name),
    ...leadAttachmentFiles.map((f) => f.name),
  ].filter(Boolean);
  const fullDraftEmail = selectedLead
    ? [
        `To: ${selectedLead.contactEmail ?? ''}`,
        '',
        greetingText,
        '',
        selectedLead.hook?.trim() ?? '',
        '',
        credibility.trim(),
        '',
        meatForLead.trim(),
        '',
        leadCta.trim(),
        '',
        'Best,',
        '[Your name]',
        ...(allAttachmentNames.length > 0
          ? ['', `Attachments: ${allAttachmentNames.join(', ')}`]
          : []),
      ].join('\n')
    : '';

  if (!activeFocus) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-sm font-mono text-muted-foreground">No focus selected. Create one in Objectives.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-72 border-r border-border flex flex-col bg-background shrink-0">
        <header className="border-b border-border px-4 py-3 shrink-0 space-y-2">
          <FocusSwitcher onNewFocus={() => navigate('/objectives')} />
          <Button
            size="sm"
            className="w-full font-mono text-xs"
            onClick={handleGenerateAllHooks}
            disabled={isGeneratingAll || leads.length === 0}
          >
            Generate All Hooks
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto">
          {leads.map((lead) => (
            <button
              key={lead.id}
              type="button"
              onClick={() => setSelectedLeadId(lead.id)}
              className={cn(
                'w-full text-left px-4 py-3 border-b border-border font-mono text-sm transition-colors',
                selectedLead?.id === lead.id
                  ? 'bg-muted border-l-2 border-l-primary'
                  : 'hover:bg-muted/50 border-l-2 border-l-transparent'
              )}
            >
              {lead.companyName}
            </button>
          ))}
        </div>
      </div>

      <aside className="flex-1 flex flex-col min-w-0 bg-background">
        <div className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="font-bold text-foreground text-base font-mono tracking-wide">
            {selectedLead ? selectedLead.companyName : 'Select a lead'}
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs"
            onClick={handleEditGeneralTemplate}
          >
            Edit General Template
          </Button>
        </div>

        {!selectedLead ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-sm font-mono text-muted-foreground">Select a company from the list.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            <div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground">To</span>
              <p className="font-mono text-sm text-foreground mt-0.5">
                {selectedLead.contactEmail ?? '—'}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Greeting</span>
              <p className="font-mono text-sm text-foreground">{greetingText}</p>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">1. The Hook</span>
              <p className="text-[11px] text-muted-foreground mb-2">Opening line that links the company to your club. AI-generated per lead.</p>
              <AIHookBlock
                reasoning={selectedLead.hookReasoning}
                hook={selectedLead.hook ?? ''}
                onHookChange={handleHookChange}
                onNewVariation={handleNewVariation}
                isGenerating={isGeneratingHook}
                editable
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {TONE_BUTTONS.map(({ tone, label }) => (
                  <Button
                    key={tone}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-mono text-xs"
                    onClick={() => handleToneRewrite(tone)}
                    disabled={isGeneratingHook}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">2. The Credibility</span>
              <p className="text-[11px] text-muted-foreground mb-2">Who you are—club size, reach, track record. Same for every email.</p>
              <div className="rounded-sm border border-border bg-muted/20 p-3 font-mono text-sm text-foreground whitespace-pre-wrap">
                {credibility}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">3. The Meat</span>
              <p className="text-[11px] text-muted-foreground mb-2">The ask: what you want and what you offer. Tied to this focus.</p>
              <Textarea
                value={meatForLead}
                onChange={(e) => handleMeatChange(e.target.value)}
                className="font-mono text-sm min-h-24 resize-y border border-border bg-background"
              />
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">4. The CTA</span>
              <p className="text-[11px] text-muted-foreground mb-2">Call to action: what you want them to do next.</p>
              <Textarea
                value={leadCta}
                onChange={(e) => handleCtaChange(e.target.value)}
                className="font-mono text-sm min-h-16 resize-y border border-border bg-background"
              />
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Attachments</span>
              {attachmentList.length > 0 && (
                <p className="font-mono text-sm text-foreground mb-1">{attachmentList.join(', ')}</p>
              )}
              {attachmentFiles.length > 0 && (
                <div className="flex flex-col gap-1 mb-2">
                  <span className="text-[10px] font-mono text-muted-foreground">From template</span>
                  {attachmentFiles.map((file, i) => (
                    <div key={`tpl-${file.name}-${i}`} className="flex items-center gap-2 rounded-sm border border-border bg-muted/20 px-3 py-2">
                      <span className="font-mono text-sm truncate flex-1" title={file.name}>{file.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0">{formatFileSize(file.size)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <span className="text-[10px] font-mono text-muted-foreground mb-1 block">For this draft</span>
                <input
                  ref={leadFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleLeadFileSelect}
                  aria-hidden
                />
                {leadAttachmentFiles.map((file, i) => (
                  <div key={`lead-${file.name}-${i}`} className="flex items-center gap-2 rounded-sm border border-border bg-muted/20 px-3 py-2 mb-1">
                    <span className="font-mono text-sm truncate flex-1" title={file.name}>{file.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">{formatFileSize(file.size)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="font-mono text-xs shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeLeadFile(i)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-mono text-xs mt-1"
                  onClick={() => leadFileInputRef.current?.click()}
                >
                  Add file
                </Button>
              </div>
            </div>
          </div>
        )}

        {selectedLead && (
          <div className="p-4 border-t border-border flex justify-between items-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs"
              onClick={() => setPreviewOpen(true)}
            >
              View Full Draft
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="font-mono text-xs">
                Save Draft
              </Button>
              {/* TODO: Send Email API would receive fullDraftEmail body + attachmentFiles from context. */}
              <Button size="sm" className="font-mono text-xs">
                Send Email
              </Button>
            </div>
          </div>
        )}
      </aside>

      {previewOpen && selectedLead && (() => {
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
              position: 'absolute',
              inset: 0,
            }}
            onClick={(e) => e.target === e.currentTarget && setPreviewOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-email-title"
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
              <div className="border-b border-neutral-200 px-6 py-4 shrink-0 flex items-center justify-between">
                <h2 id="preview-email-title" className="text-sm font-mono uppercase tracking-wide font-semibold">
                  Full draft — {selectedLead.companyName}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-mono text-xs"
                  onClick={() => setPreviewOpen(false)}
                >
                  Close
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <pre className="font-mono text-sm whitespace-pre-wrap text-left">
                  {fullDraftEmail || 'No content yet.'}
                </pre>
              </div>
            </div>
          </div>
        );
        return createPortal(modal, modalRoot);
      })()}
    </div>
  );
};

export default Sponsors;
