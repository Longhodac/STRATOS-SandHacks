import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type AIHookBlockProps = {
  reasoning?: string;
  hook: string;
  onHookChange: (value: string) => void;
  onNewVariation: () => void;
  isGenerating?: boolean;
  editable?: boolean;
  className?: string;
};

const AIHookBlock: React.FC<AIHookBlockProps> = ({
  reasoning,
  hook,
  onHookChange,
  onNewVariation,
  isGenerating = false,
  editable = true,
  className,
}) => {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {reasoning && (
        <p className="text-[11px] font-mono text-muted-foreground">{reasoning}</p>
      )}
      {editable ? (
        <Textarea
          value={hook}
          onChange={(e) => onHookChange(e.target.value)}
          placeholder="AI will generate the hook. Click New Variation to generate."
          className="font-mono text-sm min-h-24 resize-y border border-border bg-background"
          disabled={isGenerating}
        />
      ) : (
        <div className="rounded-sm border border-border bg-muted/20 p-3 font-mono text-sm text-foreground whitespace-pre-wrap">
          {hook || '—'}
        </div>
      )}
      {editable && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="font-mono text-xs"
            onClick={onNewVariation}
            disabled={isGenerating}
          >
            New Variation
          </Button>
        </div>
      )}
    </div>
  );
};

export default AIHookBlock;
