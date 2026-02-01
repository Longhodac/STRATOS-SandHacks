import React, { useState, useEffect } from 'react';
import { useFocus } from '@/lib/FocusContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Focus, PinnedContext, FocusTemplateType } from '@/types';

const TEMPLATE_TYPE_OPTIONS: { value: FocusTemplateType; label: string }[] = [
  { value: 'sponsorship', label: 'Sponsorship' },
  { value: 'collaboration', label: 'Collaboration' },
];

type FocusEditModalProps = {
  open: boolean;
  onClose: () => void;
  focusId: string | null;
};

const FocusEditModal: React.FC<FocusEditModalProps> = ({ open, onClose, focusId }) => {
  const { createFocus, updateFocus, getFocus } = useFocus();
  const existing = focusId ? getFocus(focusId) : null;

  const [name, setName] = useState('');
  const [ask, setAsk] = useState('');
  const [targetProfile, setTargetProfile] = useState('');
  const [deadline, setDeadline] = useState('');
  const [pinnedContexts, setPinnedContexts] = useState<PinnedContext[]>([]);
  const [templateType, setTemplateType] = useState<FocusTemplateType>('sponsorship');

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setName(existing.name);
      setAsk(existing.ask);
      setTargetProfile(existing.targetProfile);
      setDeadline(existing.deadline ?? '');
      setPinnedContexts(existing.pinnedContexts);
      setTemplateType(existing.templateType ?? 'sponsorship');
    } else {
      setName('');
      setAsk('');
      setTargetProfile('');
      setDeadline('');
      setPinnedContexts([]);
      setTemplateType('sponsorship');
    }
  }, [open, focusId, existing]);

  const handleSave = () => {
    const deadlineVal = deadline.trim() || null;
    if (focusId && existing) {
      updateFocus(focusId, {
        name: name.trim() || existing.name,
        ask: ask.trim(),
        targetProfile: targetProfile.trim(),
        deadline: deadlineVal,
        pinnedContexts,
        templateType,
      });
    } else {
      createFocus({
        name: name.trim() || 'New Focus',
        ask: ask.trim(),
        targetProfile: targetProfile.trim(),
        deadline: deadlineVal,
        pinnedContexts,
        templateType,
      });
    }
    onClose();
  };

  const addPinnedContext = () => {
    const label = prompt('Label (e.g. Discord: Tech Interests)');
    if (label?.trim()) {
      const source = prompt('Source (e.g. discord, gdrive)', 'discord');
      setPinnedContexts((prev) => [
        ...prev,
        { id: 'pc_' + Date.now(), label: label.trim(), source: source?.trim() ?? 'discord' },
      ]);
    }
  };

  const removePinnedContext = (id: string) => {
    setPinnedContexts((prev) => prev.filter((p) => p.id !== id));
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-modal-title"
    >
      <Card
        className={cn(
          'w-full max-w-lg rounded-sm border-border bg-card shadow-lg',
          'max-h-[90vh] flex flex-col overflow-hidden'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="border-b border-border px-6 py-4">
          <CardTitle id="focus-modal-title" className="text-sm font-mono uppercase tracking-wide text-foreground">
            {existing ? 'Edit Focus' : 'New Focus'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 overflow-y-auto p-6">
          <div>
            <label htmlFor="focus-name" className="mb-1.5 block text-[10px] font-mono uppercase text-muted-foreground">
              Goal Name
            </label>
            <Input
              id="focus-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spring Banquet"
              className="font-mono rounded-sm"
            />
          </div>
          <div>
            <label htmlFor="focus-ask" className="mb-1.5 block text-[10px] font-mono uppercase text-muted-foreground">
              The Ask
            </label>
            <Textarea
              id="focus-ask"
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              placeholder="e.g. $500, Venue Space, Guest Speakers"
              className="font-mono rounded-sm min-h-20"
            />
          </div>
          <div>
            <label htmlFor="focus-target" className="mb-1.5 block text-[10px] font-mono uppercase text-muted-foreground">
              Target Profile
            </label>
            <Input
              id="focus-target"
              value={targetProfile}
              onChange={(e) => setTargetProfile(e.target.value)}
              placeholder="e.g. Local Tech Founders, Event Spaces, Alumni"
              className="font-mono rounded-sm"
            />
          </div>
          <div>
            <span className="mb-1.5 block text-[10px] font-mono uppercase text-muted-foreground">
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
                  onClick={() => setTemplateType(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="focus-deadline" className="mb-1.5 block text-[10px] font-mono uppercase text-muted-foreground">
              Deadline
            </label>
            <Input
              id="focus-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="font-mono rounded-sm"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Pinned Context</span>
              <Button type="button" variant="ghost" size="xs" className="font-mono text-xs" onClick={addPinnedContext}>
                + Add
              </Button>
            </div>
            <ul className="space-y-1.5">
              {pinnedContexts.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-sm border border-border bg-muted/20 px-3 py-2 font-mono text-xs"
                >
                  <span className="truncate text-foreground">{p.label}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="shrink-0 font-mono text-muted-foreground hover:text-foreground"
                    onClick={() => removePinnedContext(p.id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
              {pinnedContexts.length === 0 && (
                <li className="rounded-sm border border-dashed border-border py-3 text-center text-[10px] font-mono text-muted-foreground">
                  No pinned context. Add sources the agent should use for this goal.
                </li>
              )}
            </ul>
          </div>
        </CardContent>
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" size="sm" className="font-mono" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" size="sm" className="font-mono" onClick={handleSave}>
            Save
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default FocusEditModal;
