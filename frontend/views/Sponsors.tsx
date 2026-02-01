import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useFocus } from '@/lib/FocusContext';
import { useClubProfile } from '@/lib/ClubProfileContext';
import { useSelectedLead } from '@/lib/SelectedLeadContext';
import { useAgentSidebar } from '@/lib/AgentSidebarContext';
import { useTemplateModal } from '@/lib/TemplateModalContext';
import { getMeatFromFocus, fillTemplate } from '@/lib/templateUtils';
import { formatFileSize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import FocusSwitcher from '@/components/FocusSwitcher';
import { cn } from '@/lib/utils';
import type { Lead, LeadResearchedEmail, LeadContactPage } from '@/types';
import {
  getDiscoveredCompanies,
  getResearchedCompanyByDomain,
  type DiscoveredCompany,
  type ResearchedCompany,
} from '@/services/agentsService';

const MODAL_ROOT_ID = 'modal-root';

const Sponsors: React.FC = () => {
  const navigate = useNavigate();
  const { activeFocus, updateFocus, getAttachmentFiles, getLeadAttachmentFiles, setLeadAttachmentFiles } = useFocus();
  const { profile } = useClubProfile();
  const { openTemplateModal } = useTemplateModal();
  const { selectedLeadId, setSelectedLeadId } = useSelectedLead();
  const { sidebarOpen } = useAgentSidebar();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [addSponsorOpen, setAddSponsorOpen] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newLeadName, setNewLeadName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newFunding, setNewFunding] = useState('');
  const [newContactTitle, setNewContactTitle] = useState('');
  const leadFileInputRef = useRef<HTMLInputElement>(null);
  
  // Import from Agents state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [discoveredCompanies, setDiscoveredCompanies] = useState<DiscoveredCompany[]>([]);
  const [selectedImports, setSelectedImports] = useState<Set<string>>(new Set());
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Research data for selected lead
  const [researchData, setResearchData] = useState<ResearchedCompany | null>(null);
  const [isLoadingResearch, setIsLoadingResearch] = useState(false);

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

  const handleAddSponsor = useCallback(() => {
    if (!activeFocus || !newCompany.trim() || !newLeadName.trim() || !newContactEmail.trim()) return;
    const newLead: Lead = {
      id: crypto.randomUUID(),
      confidenceScore: 0,
      companyName: newCompany.trim(),
      leadName: newLeadName.trim(),
      contactEmail: newContactEmail.trim(),
      draftReady: false,
      tier: 2,
      industry: newIndustry.trim() || undefined,
      funding: newFunding.trim() || undefined,
      contactTitle: newContactTitle.trim() || undefined,
    };
    const updatedLeads = [...leads, newLead];
    updateFocus(activeFocus.id, { leads: updatedLeads });
    setSelectedLeadId(newLead.id);
    setAddSponsorOpen(false);
    setNewCompany('');
    setNewLeadName('');
    setNewContactEmail('');
    setNewIndustry('');
    setNewFunding('');
    setNewContactTitle('');
  }, [activeFocus, leads, newCompany, newLeadName, newContactEmail, newIndustry, newFunding, newContactTitle, updateFocus, setSelectedLeadId]);

  const handleRemoveLead = useCallback(
    (leadId: string) => {
      if (!activeFocus) return;
      const updatedLeads = leads.filter((l) => l.id !== leadId);
      updateFocus(activeFocus.id, { leads: updatedLeads });
      if (selectedLeadId === leadId) {
        const next = updatedLeads[0] ?? null;
        setSelectedLeadId(next?.id ?? null);
      }
    },
    [activeFocus, leads, selectedLeadId, updateFocus, setSelectedLeadId]
  );

  // Load discovered companies from agents
  const loadDiscoveredCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const companies = await getDiscoveredCompanies();
      setDiscoveredCompanies(companies);
      setSelectedImports(new Set());
    } catch (e) {
      console.error('Failed to load discovered companies:', e);
    } finally {
      setIsLoadingCompanies(false);
    }
  }, []);

  // Toggle company selection for import
  const toggleImportSelection = useCallback((domain: string) => {
    setSelectedImports(prev => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  }, []);

  // Check if a company is already imported as a lead
  const isAlreadyImported = useCallback((domain: string) => {
    return leads.some(l => l.domain === domain);
  }, [leads]);

  // Import selected companies as leads
  const handleImportSelected = useCallback(async () => {
    if (!activeFocus || selectedImports.size === 0) return;
    
    setIsImporting(true);
    const newLeads: Lead[] = [];
    
    for (const domain of selectedImports) {
      const company = discoveredCompanies.find(c => c.domain === domain);
      if (!company || isAlreadyImported(domain)) continue;
      
      // Try to fetch research data for the company
      let researchedEmails: LeadResearchedEmail[] = [];
      let contactPages: LeadContactPage[] = [];
      let contactEmail = '';
      let leadName = 'Contact';
      
      try {
        const research = await getResearchedCompanyByDomain(domain);
        if (research) {
          researchedEmails = research.emails.map(e => ({
            email: e.email,
            purpose: e.purpose,
            confidence: e.confidence,
            source_url: e.source_url,
            evidence_quote: e.evidence_quote,
          }));
          contactPages = research.contact_pages.map(p => ({
            url: p.url,
            page_type: p.page_type,
          }));
          // Use first high-confidence email as contact
          const bestEmail = research.emails.find(e => e.confidence === 'high') || research.emails[0];
          if (bestEmail) {
            contactEmail = bestEmail.email;
          }
        }
      } catch (e) {
        // No research data available, continue with basic info
      }
      
      const newLead: Lead = {
        id: crypto.randomUUID(),
        confidenceScore: researchedEmails.length > 0 ? 70 : 0,
        companyName: company.name,
        leadName: leadName,
        contactEmail: contactEmail,
        draftReady: false,
        tier: 2,
        industry: company.industry || undefined,
        domain: domain,
        researchedEmails: researchedEmails.length > 0 ? researchedEmails : undefined,
        contactPages: contactPages.length > 0 ? contactPages : undefined,
      };
      
      newLeads.push(newLead);
    }
    
    if (newLeads.length > 0) {
      const updatedLeads = [...leads, ...newLeads];
      updateFocus(activeFocus.id, { leads: updatedLeads });
      setSelectedLeadId(newLeads[0].id);
    }
    
    setIsImporting(false);
    setImportModalOpen(false);
    setSelectedImports(new Set());
  }, [activeFocus, selectedImports, discoveredCompanies, leads, isAlreadyImported, updateFocus, setSelectedLeadId]);

  // Fetch research data when lead with domain is selected
  useEffect(() => {
    const fetchResearchData = async () => {
      if (!selectedLead?.domain) {
        setResearchData(null);
        return;
      }
      
      setIsLoadingResearch(true);
      try {
        const research = await getResearchedCompanyByDomain(selectedLead.domain);
        setResearchData(research);
      } catch (e) {
        setResearchData(null);
      } finally {
        setIsLoadingResearch(false);
      }
    };
    
    fetchResearchData();
  }, [selectedLead?.domain]);

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
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 font-mono text-xs"
              onClick={() => setAddSponsorOpen(true)}
            >
              Add sponsor
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="flex-1 font-mono text-xs"
              onClick={() => {
                setImportModalOpen(true);
                loadDiscoveredCompanies();
              }}
            >
              Import
            </Button>
          </div>
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
            <section>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Info</h4>
              </div>
              <div className="grid grid-cols-2 gap-px bg-border border border-border rounded-sm overflow-hidden">
                <Card className="rounded-none border-0 bg-background">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1 font-mono">Funding</p>
                    <p className="text-sm font-medium text-foreground">{selectedLead.funding ?? '—'}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-none border-0 bg-background">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1 font-mono">Industry</p>
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

            {/* Researched Emails Section */}
            {(selectedLead.researchedEmails?.length || researchData?.emails?.length) ? (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono">
                    Researched Emails
                  </h4>
                  {isLoadingResearch && (
                    <span className="text-[10px] font-mono text-muted-foreground">Loading...</span>
                  )}
                </div>
                <div className="space-y-2">
                  {(researchData?.emails || selectedLead.researchedEmails || []).map((email, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 rounded-sm border border-border bg-muted/20">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm font-medium truncate">{email.email}</p>
                        {email.purpose && (
                          <p className="font-mono text-xs text-muted-foreground">{email.purpose}</p>
                        )}
                      </div>
                      <Badge 
                        variant={email.confidence === 'high' ? 'default' : email.confidence === 'medium' ? 'secondary' : 'outline'} 
                        className="font-mono text-xs shrink-0"
                      >
                        {email.confidence}
                      </Badge>
                      {email.source_url && (
                        <a
                          href={email.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline shrink-0"
                        >
                          source
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Contact Pages Section */}
            {(selectedLead.contactPages?.length || researchData?.contact_pages?.length) ? (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono">
                    Contact Pages
                  </h4>
                </div>
                <div className="space-y-2">
                  {(researchData?.contact_pages || selectedLead.contactPages || []).map((page, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 rounded-sm border border-border bg-muted/20">
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-primary hover:underline truncate flex-1"
                      >
                        {page.url}
                      </a>
                      <Badge variant="outline" className="font-mono text-xs shrink-0">
                        {page.page_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

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
              <p className="text-[11px] text-muted-foreground mb-2">Opening line that links the company to your club.</p>
              <Textarea
                value={selectedLead.hook ?? ''}
                onChange={(e) => handleHookChange(e.target.value)}
                className="font-mono text-sm min-h-24 resize-y border border-border bg-background"
                placeholder="Opening line that links the company to your club."
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

      {addSponsorOpen && (() => {
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
            onClick={(e) => e.target === e.currentTarget && setAddSponsorOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-sponsor-title"
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
                <h2 id="add-sponsor-title" className="text-sm font-mono uppercase tracking-wide font-semibold">
                  Add sponsor
                </h2>
                <Button variant="ghost" size="sm" className="font-mono text-xs" onClick={() => setAddSponsorOpen(false)}>
                  Close
                </Button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Company name *</label>
                  <Input
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="Acme Inc"
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
                    placeholder="jane@acme.com"
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Industry</label>
                  <Input
                    value={newIndustry}
                    onChange={(e) => setNewIndustry(e.target.value)}
                    placeholder="Tech / SaaS"
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Funding</label>
                  <Input
                    value={newFunding}
                    onChange={(e) => setNewFunding(e.target.value)}
                    placeholder="$5K–$15K"
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Contact title</label>
                  <Input
                    value={newContactTitle}
                    onChange={(e) => setNewContactTitle(e.target.value)}
                    placeholder="Head of Marketing"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" className="font-mono text-xs" onClick={() => setAddSponsorOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="font-mono text-xs"
                    onClick={handleAddSponsor}
                    disabled={!newCompany.trim() || !newLeadName.trim() || !newContactEmail.trim()}
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

      {/* Import from Agents Modal */}
      {importModalOpen && (() => {
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
            onClick={(e) => e.target === e.currentTarget && setImportModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-agents-title"
          >
            <div
              className="w-full max-w-2xl rounded-sm border border-neutral-200 shadow-2xl max-h-[80vh] flex flex-col"
              style={{
                backgroundColor: '#ffffff',
                color: '#111111',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 id="import-agents-title" className="text-sm font-mono uppercase tracking-wide font-semibold">
                  Import from Agents
                </h2>
                <Button variant="ghost" size="sm" className="font-mono text-xs" onClick={() => setImportModalOpen(false)}>
                  Close
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {isLoadingCompanies ? (
                  <p className="text-center text-muted-foreground font-mono text-sm py-8">Loading companies...</p>
                ) : discoveredCompanies.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground font-mono text-sm">No discovered companies found.</p>
                    <p className="text-muted-foreground font-mono text-xs mt-2">
                      Use the Agents page to discover companies first.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-mono text-muted-foreground">
                        {selectedImports.size} selected
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-mono text-xs"
                        onClick={() => {
                          const selectableCompanies = discoveredCompanies.filter(c => !isAlreadyImported(c.domain));
                          if (selectedImports.size === selectableCompanies.length) {
                            setSelectedImports(new Set());
                          } else {
                            setSelectedImports(new Set(selectableCompanies.map(c => c.domain)));
                          }
                        }}
                      >
                        {selectedImports.size === discoveredCompanies.filter(c => !isAlreadyImported(c.domain)).length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                    {discoveredCompanies.map((company) => {
                      const alreadyImported = isAlreadyImported(company.domain);
                      return (
                        <div
                          key={company.domain}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-sm border',
                            alreadyImported
                              ? 'bg-muted/50 border-muted cursor-not-allowed'
                              : selectedImports.has(company.domain)
                                ? 'border-primary bg-primary/5 cursor-pointer'
                                : 'border-neutral-200 hover:border-neutral-300 cursor-pointer'
                          )}
                          onClick={() => !alreadyImported && toggleImportSelection(company.domain)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedImports.has(company.domain)}
                            disabled={alreadyImported}
                            onChange={() => toggleImportSelection(company.domain)}
                            className="shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm font-medium truncate">{company.name}</p>
                            <p className="font-mono text-xs text-muted-foreground truncate">{company.domain}</p>
                          </div>
                          {company.industry && (
                            <Badge variant="outline" className="font-mono text-xs shrink-0">
                              {company.industry}
                            </Badge>
                          )}
                          {alreadyImported && (
                            <Badge variant="secondary" className="font-mono text-xs shrink-0">
                              Imported
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="border-t border-neutral-200 px-6 py-4 flex justify-end gap-2 shrink-0">
                <Button variant="outline" size="sm" className="font-mono text-xs" onClick={() => setImportModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="font-mono text-xs"
                  onClick={handleImportSelected}
                  disabled={selectedImports.size === 0 || isImporting}
                >
                  {isImporting ? 'Importing...' : `Import ${selectedImports.size} Selected`}
                </Button>
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
