import React, { useRef, useEffect, useState } from 'react';
import { useFocus } from '@/lib/FocusContext';
import { cn } from '@/lib/utils';

type FocusSwitcherProps = {
  onNewFocus: () => void;
};

const FocusSwitcher: React.FC<FocusSwitcherProps> = ({ onNewFocus }) => {
  const { focuses, activeFocusId, activeFocus, setActiveFocus } = useFocus();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-2 rounded-sm border border-border bg-background px-3 py-2',
          'text-left text-sm font-medium text-foreground font-mono',
          'hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background'
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide shrink-0">
          Focus:
        </span>
        <span className="truncate max-w-[200px]">{activeFocus?.name ?? '—'}</span>
        <span className="text-muted-foreground shrink-0" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-sm border border-border bg-white py-1 shadow-md"
        >
          {focuses.map((f) => (
            <li key={f.id} role="option" aria-selected={f.id === activeFocusId}>
              <button
                type="button"
                onClick={() => {
                  setActiveFocus(f.id);
                  setOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm font-mono',
                  f.id === activeFocusId
                    ? 'bg-neutral-200 text-neutral-900'
                    : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                )}
              >
                {f.name}
              </button>
            </li>
          ))}
          <li className="border-t border-border mt-1 pt-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onNewFocus();
              }}
              className="w-full px-3 py-2 text-left text-sm font-mono text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            >
              + New Focus
            </button>
          </li>
        </ul>
      )}
    </div>
  );
};

export default FocusSwitcher;
