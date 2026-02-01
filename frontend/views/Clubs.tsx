import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useFocus } from '@/lib/FocusContext';
import { useClubProfile } from '@/lib/ClubProfileContext';
import { useSelectedLead } from '@/lib/SelectedLeadContext';
import { useAgentSidebar } from '@/lib/AgentSidebarContext';
import { useTemplateModal } from '@/lib/TemplateModalContext';
import { getMeatFromFocus, fillTemplate } from '@/lib/templateUtils';
import { openGmailCompose, generateCollaborationSubject } from '@/lib/gmailUtils';
import { formatFileSize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FocusSwitcher from '@/components/FocusSwitcher';
import { cn } from '@/lib/utils';
import type { Lead } from '@/types';

const MODAL_ROOT_ID = 'modal-root';

const Clubs: React.FC = () => {
  const navigate = useNavigate();
  const { focuses, activeFocus, setActiveFocus, updateFocus, getAttachmentFiles, getLeadAttachmentFiles, setLeadAttachmentFiles } = useFocus();
  const { profile } = useClubProfile();
  const { openTemplateModal } = useTemplateModal();
  const { selectedLeadId, setSelectedLeadId } = useSelectedLead();
  const { sidebarOpen } = useAgentSidebar();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [addClubOpen, setAddClubOpen] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newLeadName, setNewLeadName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newFunding, setNewFunding] = useState('');
  const [newContactTitle, setNewContactTitle] = useState('');
  const leadFileInputRef = useRef<HTMLInputElement>(null);

  const collaborationFocuses = useMemo(
    () => focuses.filter((f) => f.templateType === 'collaboration'),
    [focuses]
  );
  const activeFocusIsCollaboration = activeFocus?.templateType === 'collaboration';
  const effectiveFocus = activeFocusIsCollaboration
    ? activeFocus
    : (collaborationFocuses[0] ?? null);

  useEffect(() => {
    if (!activeFocusIsCollaboration && collaborationFocuses.length > 0) {
      setActiveFocus(collaborationFocuses[0].id);
    }
  }, [activeFocusIsCollaboration, collaborationFocuses, setActiveFocus]);

  const leads = effectiveFocus?.leads ?? [];
  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? leads[0] ?? null;

  useEffect(() => {
    if (leads.length > 0 && (!selectedLeadId || !leads.some((l) => l.id === selectedLeadId))) {
      setSelectedLeadId(leads[0].id);
    } else if (leads.length === 0) {
      setSelectedLeadId(null);
    }
  }, [leads, selectedLeadId]);
  const bricks = effectiveFocus?.templateBricks;
  const credibility = bricks?.credibility ?? `We are ${profile.clubName}. We represent students and run events that reach the broader campus community.`;
  const meatFromFocus = effectiveFocus ? getMeatFromFocus(effectiveFocus) : '';
  const meatForLead = selectedLead?.meatOverride ?? meatFromFocus;
  const templateCta = bricks?.cta ?? 'Would you be open to a short call?';
  const leadCta = selectedLead?.cta ?? templateCta;

  const handleHookChange = useCallback(
    (value: string) => {
      if (!selectedLead || !effectiveFocus) return;
      const updatedLeads = leads.map((l) =>
        l.id === selectedLead.id ? { ...l, hook: value } : l
      );
      updateFocus(effectiveFocus.id, { leads: updatedLeads });
    },
    [selectedLead, effectiveFocus, leads, updateFocus]
  );

  const handleMeatChange = useCallback(
    (value: string) => {
      if (!selectedLead || !effectiveFocus) return;
      const meatFromFocusVal = effectiveFocus.templateBricks?.meat ?? getMeatFromFocus(effectiveFocus);
      const updatedLeads = leads.map((l) =>
        l.id === selectedLead.id ? { ...l, meatOverride: value === meatFromFocusVal ? undefined : value } : l
      );
      updateFocus(effectiveFocus.id, { leads: updatedLeads });
    },
    [selectedLead, effectiveFocus, leads, updateFocus]
  );

  const handleCtaChange = useCallback(
    (value: string) => {
      if (!selectedLead || !effectiveFocus) return;
      const updatedLeads = leads.map((l) =>
        l.id === selectedLead.id ? { ...l, cta: value } : l
      );
      updateFocus(effectiveFocus.id, { leads: updatedLeads });
    },
    [selectedLead, effectiveFocus, leads, updateFocus]
  );

  const handleSubjectChange = useCallback(
    (value: string) => {
      if (!selectedLead || !effectiveFocus) return;
      const updatedLeads = leads.map((l) =>
        l.id === selectedLead.id ? { ...l, subject: value } : l
      );
      updateFocus(effectiveFocus.id, { leads: updatedLeads });
    },
    [selectedLead, effectiveFocus, leads, updateFocus]
  );

  const handleEditGeneralTemplate = useCallback(() => {
    if (effectiveFocus) openTemplateModal(effectiveFocus.id);
  }, [effectiveFocus, openTemplateModal]);

  const greetingText = selectedLead && bricks?.greeting
    ? fillTemplate(bricks.greeting, { lead_name: selectedLead.leadName })
    : selectedLead
      ? `Dear ${selectedLead.leadName},`
      : '';

  const attachmentList = bricks?.attachments?.filter(Boolean) ?? [];
  const attachmentFiles = effectiveFocus ? getAttachmentFiles(effectiveFocus.id) : [];
  const leadAttachmentFiles =
    selectedLead && effectiveFocus ? getLeadAttachmentFiles(effectiveFocus.id, selectedLead.id) : [];

  const handleLeadFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedLead || !effectiveFocus || !e.target.files?.length) return;
      const files = e.target.files;
      const next: File[] = [...leadAttachmentFiles, ...Array.from<File>(files)];
      setLeadAttachmentFiles(effectiveFocus.id, selectedLead.id, next);
      e.target.value = '';
    },
    [selectedLead, effectiveFocus, leadAttachmentFiles, setLeadAttachmentFiles]
  );

  const removeLeadFile = useCallback(
    (index: number) => {
      if (!selectedLead || !effectiveFocus) return;
      const next = leadAttachmentFiles.filter((_, i) => i !== index);
      setLeadAttachmentFiles(effectiveFocus.id, selectedLead.id, next);
    },
    [selectedLead, effectiveFocus, leadAttachmentFiles, setLeadAttachmentFiles]
  );

  const handleAddClub = useCallback(() => {
    if (!effectiveFocus || !newClubName.trim() || !newLeadName.trim() || !newContactEmail.trim()) return;
    const newLead: Lead = {
      id: crypto.randomUUID(),
      confidenceScore: 0,
      companyName: newClubName.trim(),
      leadName: newLeadName.trim(),
      contactEmail: newContactEmail.trim(),
      draftReady: false,
      tier: 2,
      industry: newIndustry.trim() || undefined,
      funding: newFunding.trim() || undefined,
      contactTitle: newContactTitle.trim() || undefined,
    };
    const updatedLeads = [...leads, newLead];
    updateFocus(effectiveFocus.id, { leads: updatedLeads });
    setSelectedLeadId(newLead.id);
    setAddClubOpen(false);
    setNewClubName('');
    setNewLeadName('');
    setNewContactEmail('');
    setNewIndustry('');
    setNewFunding('');
    setNewContactTitle('');
  }, [effectiveFocus, leads, newClubName, newLeadName, newContactEmail, newIndustry, newFunding, newContactTitle, updateFocus, setSelectedLeadId]);

  const handleRemoveLead = useCallback(
    (leadId: string) => {
      if (!effectiveFocus) return;
      const updatedLeads = leads.filter((l) => l.id !== leadId);
      updateFocus(effectiveFocus.id, { leads: updatedLeads });
      if (selectedLeadId === leadId) {
        const next = updatedLeads[0] ?? null;
        setSelectedLeadId(next?.id ?? null);
      }
    },
    [effectiveFocus, leads, selectedLeadId, updateFocus, setSelectedLeadId]
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

  // Email body for Gmail (without the "To:" line)
  const emailBody = selectedLead
    ? [
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
        profile?.name ?? '[Your name]',
        ...(allAttachmentNames.length > 0
          ? ['', `Attachments: ${allAttachmentNames.join(', ')}`]
          : []),
      ].join('\n')
    : '';

  // Default subject for the email
  const defaultSubject = selectedLead && profile
    ? generateCollaborationSubject(profile.name, selectedLead.companyName)
    : '';

  const handleSendEmail = useCallback(() => {
    if (!selectedLead?.contactEmail || !profile || !effectiveFocus) return;
    
    // Calculate values fresh inside the callback
    const greeting = bricks?.greeting
      ? fillTemplate(bricks.greeting, { lead_name: selectedLead.leadName })
      : `Dear ${selectedLead.leadName},`;
    
    const cred = bricks?.credibility ?? profile.credibility ?? '';
    const meat = selectedLead.meatOverride ?? bricks?.meat ?? getMeatFromFocus(effectiveFocus);
    const cta = selectedLead.cta ?? bricks?.cta ?? '';
    
    const attachments = [
      ...(bricks?.attachments?.filter(Boolean) ?? []),
      ...getAttachmentFiles(effectiveFocus.id).map(f => f.name),
      ...getLeadAttachmentFiles(effectiveFocus.id, selectedLead.id).map(f => f.name),
    ].filter(Boolean);
    
    const body = [
      greeting,
      '',
      selectedLead.hook?.trim() ?? '',
      '',
      cred.trim(),
      '',
      meat.trim(),
      '',
      cta.trim(),
      '',
      'Best,',
      profile.name ?? '[Your name]',
      ...(attachments.length > 0 ? ['', `Attachments: ${attachments.join(', ')}`] : []),
    ].join('\n');
    
    const subject = selectedLead.subject || generateCollaborationSubject(profile.name, selectedLead.companyName);
    
    openGmailCompose({
      to: selectedLead.contactEmail,
      subject: subject,
      body: body,
    });
  }, [selectedLead, profile, bricks, effectiveFocus, getAttachmentFiles, getLeadAttachmentFiles]);

  if (collaborationFocuses.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-sm font-mono text-muted-foreground">No collaboration focus. Create one in Objectives.</p>
      </div>
    );
  }

  if (!effectiveFocus) {
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
          <FocusSwitcher onNewFocus={() => navigate('/objectives')} templateType="collaboration" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full font-mono text-xs"
            onClick={() => setAddClubOpen(true)}
          >
            Add club
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className={cn(
                'flex items-center border-b border-border',
                selectedLead?.id === lead.id
                  ? 'bg-muted border-l-2 border-l-primary'
                  : 'border-l-2 border-l-transparent hover:bg-muted/50'
              )}
            >
              <button
                type="button"
                onClick={() => setSelectedLeadId(lead.id)}
                className={cn(
                  'flex-1 min-w-0 text-left px-4 py-3 font-mono text-sm transition-colors',
                  sidebarOpen && selectedLead?.id === lead.id && 'ring-2 ring-white ring-inset animate-pulse'
                )}
              >
                {lead.companyName}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 font-mono text-[10px] text-muted-foreground hover:text-destructive mr-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveLead(lead.id);
                }}
                aria-label={`Remove ${lead.companyName}`}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      <aside className="flex-1 flex flex-col min-w-0 bg-background">
        <div className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="font-bold text-foreground text-base font-mono tracking-wide">
            {selectedLead ? selectedLead.companyName : 'Select a club'}
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
            <p className="text-sm font-mono text-muted-foreground">Select a club from the list.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            <section>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Info</h4>
              </div>
              <div className="grid grid-cols-2 gap-px bg-border border border-border rounded-sm overflow-hidden">
                <Card className="rounded-none border-0 bg-background">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1 font-mono">Members</p>
                    <p className="text-sm font-medium text-foreground">{selectedLead.funding ?? '—'}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-none border-0 bg-background">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1 font-mono">Focus</p>
                    <p className="text-sm font-medium text-foreground">{selectedLead.industry ?? '—'}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-none border-0 bg-background col-span-2">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1 font-mono">Contact</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">
                        {selectedLead.contactTitle ? `${selectedLead.leadName}, ${selectedLead.contactTitle}` : selectedLead.leadName}
                      </p>
                      {selectedLead.verified && (
                        <span className="text-[10px] text-green-500 font-mono uppercase">VERIFIED</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            <div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">To</span>
              {selectedLead.researchedEmails?.length ? (
                <Select
                  value={selectedLead.contactEmail || ''}
                  onValueChange={(email) => {
                    if (!effectiveFocus || !selectedLead) return;
                    const updatedLeads = leads.map(l =>
                      l.id === selectedLead.id ? { ...l, contactEmail: email } : l
                    );
                    updateFocus(effectiveFocus.id, { leads: updatedLeads });
                  }}
                >
                  <SelectTrigger className="font-mono text-sm">
                    <SelectValue placeholder="Select email address" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedLead.researchedEmails.map((email, idx) => (
                      <SelectItem key={idx} value={email.email} className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <span className="flex-1 truncate">{email.email}</span>
                          <Badge 
                            variant={email.confidence === 'high' ? 'default' : email.confidence === 'medium' ? 'secondary' : 'outline'} 
                            className="font-mono text-xs"
                          >
                            {email.confidence}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="font-mono text-sm text-foreground mt-0.5">
                  {selectedLead.contactEmail ?? '—'}
                </p>
              )}
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Subject</span>
              <Input
                value={selectedLead.subject ?? ''}
                onChange={(e) => handleSubjectChange(e.target.value)}
                placeholder={defaultSubject}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Greeting</span>
              <p className="font-mono text-sm text-foreground">{greetingText}</p>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">1. The Hook</span>
              <p className="text-[11px] text-muted-foreground mb-2">Opening line that links their club to yours.</p>
              <Textarea
                value={selectedLead.hook ?? ''}
                onChange={(e) => handleHookChange(e.target.value)}
                className="font-mono text-sm min-h-24 resize-y border border-border bg-background"
                placeholder="Opening line that links their club to yours."
              />
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
              <p className="text-[11px] text-muted-foreground mb-2">The ask: collaboration or event idea and what you offer. Tied to this focus.</p>
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
              <Button 
                size="sm" 
                className="font-mono text-xs"
                onClick={handleSendEmail}
                disabled={!selectedLead?.contactEmail}
              >
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

      {addClubOpen && (() => {
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
            onClick={(e) => e.target === e.currentTarget && setAddClubOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-club-title"
          >
            <div
              className="w-full max-w-md rounded-sm border border-neutral-200 shadow-2xl"
              style={{
                backgroundColor: '#ffffff',
                color: '#111111',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
                <h2 id="add-club-title" className="text-sm font-mono uppercase tracking-wide font-semibold">
                  Add club
                </h2>
                <Button variant="ghost" size="sm" className="font-mono text-xs" onClick={() => setAddClubOpen(false)}>
                  Close
                </Button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Club name *</label>
                  <Input
                    value={newClubName}
                    onChange={(e) => setNewClubName(e.target.value)}
                    placeholder="Design & UX Club"
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Contact name *</label>
                  <Input
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    placeholder="Jane Smith"
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Contact email *</label>
                  <Input
                    type="email"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    placeholder="jane@designux.edu"
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Focus</label>
                  <Input
                    value={newIndustry}
                    onChange={(e) => setNewIndustry(e.target.value)}
                    placeholder="Design, UX, workshops"
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Members</label>
                  <Input
                    value={newFunding}
                    onChange={(e) => setNewFunding(e.target.value)}
                    placeholder="~30 members"
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Contact title</label>
                  <Input
                    value={newContactTitle}
                    onChange={(e) => setNewContactTitle(e.target.value)}
                    placeholder="President"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" className="font-mono text-xs" onClick={() => setAddClubOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="font-mono text-xs"
                    onClick={handleAddClub}
                    disabled={!newClubName.trim() || !newLeadName.trim() || !newContactEmail.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
        return createPortal(modal, modalRoot);
      })()}
    </div>
  );
};

export default Clubs;
