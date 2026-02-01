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
    <div
      className={cn(
        'rounded-sm border-2 border-muted bg-muted/30 p-4 flex flex-col gap-3',
        className
      )}
    >
      {reasoning && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-background/80 px-2 py-0.5 rounded">
            Reasoning
          </span>
          <span className="text-xs font-mono text-muted-foreground">{reasoning}</span>
        </div>
      )}
      {editable ? (
        <Textarea
          value={hook}
          onChange={(e) => onHookChange(e.target.value)}
          placeholder="AI will generate the hook. Click New Variation to generate."
          className="font-mono text-sm min-h-16 resize-y border-border bg-background"
          disabled={isGenerating}
        />
      ) : (
        <p className="font-mono text-sm text-foreground whitespace-pre-wrap">{hook || '—'}</p>
      )}
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
    </div>
  );
};

export default AIHookBlock;
