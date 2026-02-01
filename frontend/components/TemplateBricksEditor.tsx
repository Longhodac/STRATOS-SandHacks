import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatFileSize } from '@/lib/utils';
import type { FocusTemplateBricks } from '@/types';

const SECTION_DESCRIPTIONS: Record<string, string> = {
  greeting: 'Opening salutation. Use {{lead_name}} to insert the contact\'s name.',
  hook: 'Opening line that links the company to your club. AI generates this per lead; set instructions below.',
  credibility: 'Who you are—club size, reach, track record. Same for every email.',
  meat: 'The ask: what you want (e.g. funding, partnership) and what you offer. Tied to this focus.',
  cta: 'Call to action: what you want them to do next (e.g. schedule a call, review a deck).',
  attachments: 'Labels or files to attach. Uploaded files are kept in memory until you close; a future Send Email API would receive them.',
};

type TemplateBricksEditorProps = {
  bricks: FocusTemplateBricks;
  onChange: (bricks: FocusTemplateBricks) => void;
  className?: string;
  attachmentFiles?: File[];
  onAttachmentFilesChange?: (files: File[]) => void;
};

const TemplateBricksEditor: React.FC<TemplateBricksEditorProps> = ({
  bricks,
  onChange,
  className,
  attachmentFiles: attachmentFilesProp,
  onAttachmentFilesChange,
}) => {
  const [attachmentFilesLocal, setAttachmentFilesLocal] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const attachmentFiles = onAttachmentFilesChange ? (attachmentFilesProp ?? []) : attachmentFilesLocal;
  const setAttachmentFiles = onAttachmentFilesChange ?? ((files: File[]) => setAttachmentFilesLocal(files));

  const update = (patch: Partial<FocusTemplateBricks>) => {
    onChange({ ...bricks, ...patch });
  };

  const attachments = Array.isArray(bricks.attachments) ? bricks.attachments : [];
  const setAttachment = (index: number, value: string) => {
    const next = [...attachments];
    next[index] = value;
    update({ attachments: next });
  };
  const addAttachment = () => update({ attachments: [...attachments, ''] });
  const removeAttachment = (index: number) =>
    update({ attachments: attachments.filter((_, i) => i !== index) });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) {
      setAttachmentFiles([...attachmentFiles, ...Array.from(files)]);
    }
    e.target.value = '';
  };
  const removeFile = (index: number) => {
    setAttachmentFiles(attachmentFiles.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-mono uppercase text-muted-foreground">0. Greeting</span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-2">{SECTION_DESCRIPTIONS.greeting}</p>
        <Input
          value={bricks.greeting}
          onChange={(e) => update({ greeting: e.target.value })}
          placeholder="Dear {{lead_name}},"
          className="font-mono rounded-sm border border-border bg-background"
        />
      </div>
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-mono uppercase text-muted-foreground">1. The Hook</span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-2">{SECTION_DESCRIPTIONS.hook}</p>
        <Textarea
          value={bricks.hookInstructions}
          onChange={(e) => update({ hookInstructions: e.target.value })}
          placeholder="Instructions for the opening line (e.g. link company to club, focus on technical projects)..."
          className="font-mono rounded-sm min-h-20 border border-border bg-background"
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-mono uppercase text-muted-foreground">2. The Credibility</span>
          <span className="text-[10px] font-mono text-muted-foreground">CLUB STATIC</span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-2">{SECTION_DESCRIPTIONS.credibility}</p>
        <Textarea
          value={bricks.credibility}
          onChange={(e) => update({ credibility: e.target.value })}
          placeholder="We represent 300+ students..."
          className="font-mono rounded-sm min-h-20 border border-border bg-background"
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-mono uppercase text-muted-foreground">3. The Meat</span>
          <span className="text-[10px] font-mono text-muted-foreground">GOAL SPECIFIC</span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-2">{SECTION_DESCRIPTIONS.meat}</p>
        <Textarea
          value={bricks.meat}
          onChange={(e) => update({ meat: e.target.value })}
          placeholder="We are seeking $500 for..."
          className="font-mono rounded-sm min-h-20 border border-border bg-background"
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-mono uppercase text-muted-foreground">4. The CTA</span>
          <span className="text-[10px] font-mono text-muted-foreground">STATIC</span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-2">{SECTION_DESCRIPTIONS.cta}</p>
        <Textarea
          value={bricks.cta}
          onChange={(e) => update({ cta: e.target.value })}
          placeholder="Would you be open to a short call?"
          className="font-mono rounded-sm min-h-16 border border-border bg-background"
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-mono uppercase text-muted-foreground">5. Attachments</span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-2">{SECTION_DESCRIPTIONS.attachments}</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          aria-hidden
        />
        <div className="flex flex-col gap-2">
          {attachments.map((label, i) => (
            <div key={`label-${i}`} className="flex items-center gap-2">
              <Input
                value={label}
                onChange={(e) => setAttachment(i, e.target.value)}
                placeholder="e.g. Pitch Deck.pdf"
                className="font-mono rounded-sm border border-border bg-background flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="font-mono text-xs shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeAttachment(i)}
              >
                Remove
              </Button>
            </div>
          ))}
          {attachmentFiles.map((file, i) => (
            <div key={`file-${i}-${file.name}`} className="flex items-center gap-2 rounded-sm border border-border bg-muted/20 px-3 py-2">
              <span className="font-mono text-sm truncate flex-1" title={file.name}>{file.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground shrink-0">{formatFileSize(file.size)}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="font-mono text-xs shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeFile(i)}
              >
                Remove
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="font-mono text-xs w-fit" onClick={addAttachment}>
              Add label
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-mono text-xs w-fit"
              onClick={() => fileInputRef.current?.click()}
            >
              Add file
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateBricksEditor;
