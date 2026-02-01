import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFocus } from '@/lib/FocusContext';
import { useTemplateModal } from '@/lib/TemplateModalContext';
import { getDefaultMasterTemplate, getDefaultTemplateBricks } from '@/lib/templateUtils';
import TemplateBricksEditor from '@/components/TemplateBricksEditor';
import { cn } from '@/lib/utils';
import type { Focus, FocusStatus, PinnedContext, FocusTemplateType, FocusTemplateBricks } from '@/types';

const TARGET_OPTIONS = ['Local Business', 'Tech', 'Alumni', 'Event Spaces', 'Campus Clubs'];

const AVAILABLE_CONTEXT_SOURCES: PinnedContext[] = [
  { id: 'ctx-gdrive-pitch', label: 'Google Drive: Pitch Deck', source: 'gdrive' },
  { id: 'ctx-website-about', label: 'Club Website: About Us', source: 'website' },
  { id: 'ctx-discord', label: 'Discord: Technical Interest Groups', source: 'discord' },
  { id: 'ctx-gdrive-sponsor', label: 'Google Drive: Sponsorship Deck', source: 'gdrive' },
];

const STATUS_LABELS: Record<FocusStatus, string> = {
  active: 'Active',
  draft: 'Draft',
  paused: 'Paused',
  archived: 'Archived',
};

const TEMPLATE_TYPE_OPTIONS: { value: FocusTemplateType; label: string }[] = [
  { value: 'sponsorship', label: 'Sponsorship' },
  { value: 'collaboration', label: 'Collaboration' },
];

const Objectives: React.FC = () => {
  const { focuses, createFocus, updateFocus, deleteFocus, getAttachmentFiles, setAttachmentFiles } = useFocus();
  const { openTemplateModal } = useTemplateModal();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isCreate = editingId === '';
  const editingFocus = editingId && editingId !== '' ? focuses.find((f) => f.id === editingId) ?? null : null;

  const [mission, setMission] = useState('');
  const [targetTags, setTargetTags] = useState<string[]>([]);
  const [contextIds, setContextIds] = useState<string[]>([]);
  const [templateType, setTemplateType] = useState<FocusTemplateType>('sponsorship');
  const [templateBody, setTemplateBody] = useState('');
  const [templateBricks, setTemplateBricks] = useState<FocusTemplateBricks>(() => getDefaultTemplateBricks('sponsorship'));

  const startCreate = useCallback(() => {
    setEditingId('');
    setMission('');
    setTargetTags([]);
    setContextIds([]);
    setTemplateType('sponsorship');
    setTemplateBody(getDefaultMasterTemplate('sponsorship'));
    setTemplateBricks(getDefaultTemplateBricks('sponsorship'));
  }, []);

  const startEdit = useCallback((focus: Focus) => {
    setEditingId(focus.id);
    setMission(focus.ask || focus.name);
    setTargetTags(focus.targetTags ?? []);
    setTemplateType(focus.templateType ?? 'sponsorship');
    setTemplateBody(focus.masterTemplate ?? getDefaultMasterTemplate(focus.templateType ?? 'sponsorship'));
    setTemplateBricks(focus.templateBricks ?? getDefaultTemplateBricks(focus.templateType ?? 'sponsorship'));
    const matched = focus.pinnedContexts.flatMap((p) => {
      const found = AVAILABLE_CONTEXT_SOURCES.find((c) => c.label === p.label);
      return found ? [found.id] : [];
    });
    setContextIds(matched);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const toggleTarget = useCallback((tag: string) => {
    setTargetTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const toggleContext = useCallback((id: string) => {
    setContextIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }, []);

  const handleSave = useCallback(() => {
    const pinnedContexts = AVAILABLE_CONTEXT_SOURCES.filter((c) =>
      contextIds.includes(c.id)
    );
    const name = mission.trim() || 'New Focus';
    if (isCreate) {
      createFocus({
        name,
        ask: mission.trim(),
        targetProfile: targetTags.join(', '),
        targetTags,
        pinnedContexts,
        templateType,
        masterTemplate: templateBody,
        templateBricks,
        status: 'active',
      });
    } else if (editingFocus) {
      const updatedLeads = editingFocus.leads.map((lead) => ({
        ...lead,
        cta: undefined,
        meatOverride: undefined,
      }));
      updateFocus(editingFocus.id, {
        name,
        ask: mission.trim(),
        targetProfile: targetTags.join(', '),
        targetTags,
        pinnedContexts,
        templateType,
        masterTemplate: templateBody,
        templateBricks,
        leads: updatedLeads,
        status: editingFocus.status === 'draft' ? 'active' : editingFocus.status,
      });
    }
    setEditingId(null);
  }, [isCreate, editingFocus, mission, targetTags, contextIds, templateType, templateBody, templateBricks, createFocus, updateFocus]);

  const setTemplateTypeAndResetBody = useCallback((type: FocusTemplateType) => {
    setTemplateType(type);
    setTemplateBody(getDefaultMasterTemplate(type));
    setTemplateBricks(getDefaultTemplateBricks(type));
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (deleteConfirmId === id) {
      deleteFocus(id);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
    }
  }, [deleteConfirmId, deleteFocus]);

  const handlePause = useCallback((id: string) => {
    updateFocus(id, { status: 'paused' });
  }, [updateFocus]);

  const handleResume = useCallback((id: string) => {
    updateFocus(id, { status: 'active' });
  }, [updateFocus]);

  const handleArchive = useCallback((id: string) => {
    updateFocus(id, { status: 'archived' });
  }, [updateFocus]);

  const handleStartResearch = useCallback((id: string) => {
    updateFocus(id, { status: 'active' });
  }, [updateFocus]);

  const displayFocuses = focuses.filter((f) => f.status !== 'archived');

  if (editingId !== null) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          <div className="max-w-2xl mx-auto flex flex-col gap-8">
            <h2 className="text-sm font-mono uppercase tracking-wide text-muted-foreground">
              {isCreate ? 'New Focus' : 'Edit Focus'}
            </h2>
            <div>
              <label htmlFor="mission" className="mb-2 block text-xs font-mono uppercase text-muted-foreground">
                What is the mission?
              </label>
              <Textarea
                id="mission"
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                placeholder="e.g. $1,000 / 20 Pizzas for March Hackathon"
                className="font-mono rounded-sm min-h-24 border border-border bg-background"
              />
            </div>
            <div>
              <span className="mb-2 block text-xs font-mono uppercase text-muted-foreground">
                Target selection
              </span>
              <div className="flex flex-wrap gap-2">
                {TARGET_OPTIONS.map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    variant={targetTags.includes(tag) ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'rounded-full font-mono text-xs',
                      targetTags.includes(tag) && 'bg-black text-white hover:bg-black/90 border-0'
                    )}
                    onClick={() => toggleTarget(tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-2 block text-xs font-mono uppercase text-muted-foreground">
                Context linking
              </span>
              <ul className="space-y-2">
                {AVAILABLE_CONTEXT_SOURCES.map((ctx) => (
                  <li key={ctx.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={ctx.id}
                      checked={contextIds.includes(ctx.id)}
                      onChange={() => toggleContext(ctx.id)}
                      className="size-4 rounded border-border bg-background"
                    />
                    <label htmlFor={ctx.id} className="text-sm font-mono text-foreground cursor-pointer">
                      {ctx.label}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="mb-2 block text-xs font-mono uppercase text-muted-foreground">
                Template type
              </span>
              <div className="flex gap-2">
                {TEMPLATE_TYPE_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={templateType === opt.value ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'rounded-sm font-mono text-xs',
                      templateType === opt.value && 'bg-black text-white hover:bg-black/90 border-0'
                    )}
                    onClick={() => setTemplateTypeAndResetBody(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] font-mono text-muted-foreground">
                {templateType === 'sponsorship'
                  ? 'Uses: The Ask (cash/in-kind), Sponsor Benefits'
                  : 'Uses: Mutual Exchange, Calendar Sync'}
              </p>
            </div>
            <div>
              <span className="mb-2 block text-xs font-mono uppercase text-muted-foreground">
                General template (4 bricks)
              </span>
              <TemplateBricksEditor
                bricks={templateBricks}
                onChange={setTemplateBricks}
                attachmentFiles={editingFocus ? getAttachmentFiles(editingFocus.id) : undefined}
                onAttachmentFilesChange={editingFocus ? (files) => setAttachmentFiles(editingFocus.id, files) : undefined}
              />
            </div>
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 font-mono bg-white text-black border-black hover:bg-muted"
                onClick={cancelEdit}
              >
                Cancel
              </Button>
              <Button
                size="lg"
                className="flex-1 font-mono bg-black text-white hover:bg-black/90 border-0"
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          <header>
            <Button
              size="lg"
              className="w-full sm:w-auto font-mono bg-black text-white hover:bg-black/90 text-base px-6 py-6 rounded-sm gap-2"
              onClick={startCreate}
            >
              <span className="text-lg leading-none">+</span>
              Create New Focus
            </Button>
          </header>
          <div className="border border-border rounded-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-mono text-xs uppercase text-muted-foreground">Focus Name</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-muted-foreground">Status</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-muted-foreground">Leads</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayFocuses.map((focus) => (
                  <TableRow key={focus.id} className="border-border">
                    <TableCell className="font-mono text-foreground">{focus.name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {STATUS_LABELS[focus.status]}
                    </TableCell>
                    <TableCell className="font-mono">{focus.leads.length}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button variant="ghost" size="sm" className="font-mono text-xs" onClick={() => openTemplateModal(focus.id)}>
                          Template
                        </Button>
                        <Button variant="ghost" size="sm" className="font-mono text-xs" onClick={() => startEdit(focus)}>
                          Edit
                        </Button>
                        {focus.status === 'active' && (
                          <Button variant="ghost" size="sm" className="font-mono text-xs" onClick={() => handlePause(focus.id)}>
                            Pause
                          </Button>
                        )}
                        {focus.status === 'paused' && (
                          <Button variant="ghost" size="sm" className="font-mono text-xs" onClick={() => handleResume(focus.id)}>
                            Resume
                          </Button>
                        )}
                        {focus.status === 'draft' && (
                          <Button variant="ghost" size="sm" className="font-mono text-xs" onClick={() => handleStartResearch(focus.id)}>
                            Start Research
                          </Button>
                        )}
                        {(focus.status === 'active' || focus.status === 'paused') && (
                          <Button variant="ghost" size="sm" className="font-mono text-xs" onClick={() => handleArchive(focus.id)}>
                            Archive
                          </Button>
                        )}
                        {deleteConfirmId === focus.id ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="font-mono text-xs border-destructive text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(focus.id)}
                          >
                            Sure?
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="font-mono text-xs border-border"
                            onClick={() => handleDelete(focus.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {displayFocuses.length === 0 && (
            <p className="text-sm font-mono text-muted-foreground text-center py-8">
              No focuses yet. Create one to get started.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Objectives;
