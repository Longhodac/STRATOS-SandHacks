import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocus } from '@/lib/FocusContext';
import { useAgentMode } from '@/lib/AgentModeContext';
import { AGENT_MODE_LABELS } from '@/types';
import { cn } from '@/lib/utils';

type FocusSwitcherProps = {
  onNewFocus: () => void;
};

const FocusSwitcher: React.FC<FocusSwitcherProps> = ({ onNewFocus }) => {
  const { focuses, activeFocusId, activeFocus, setActiveFocus } = useFocus();
  const { mode } = useAgentMode();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; minWidth: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        minWidth: rect.width,
      });
    }
  };

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      const dropdownEl = document.querySelector('[data-focus-switcher-dropdown]');
      if (dropdownEl?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-2 rounded-sm border border-border bg-background px-3 py-2 max-w-[220px] min-w-0',
          'text-left text-sm font-medium text-foreground font-mono',
          'hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background'
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide shrink-0">
          Focus:
        </span>
        <span className="truncate min-w-0">{activeFocus?.name ?? '—'}</span>
        <span className="text-muted-foreground shrink-0" aria-hidden>
          ▾
        </span>
      </button>

      {open && position && (() => {
        const dropdown = (
          <ul
            data-focus-switcher-dropdown
            role="listbox"
            className="fixed z-[9999] w-max max-w-[280px] max-h-[min(70vh,400px)] overflow-y-auto rounded-sm border border-neutral-200 bg-white py-1 shadow-md"
            style={{ top: position.top, left: position.left }}
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
                    'w-full px-3 py-2 text-left text-sm font-mono truncate block',
                    f.id === activeFocusId
                      ? 'bg-neutral-200 text-neutral-900'
                      : 'text-neutral-800 hover:bg-neutral-100'
                  )}
                >
                  {f.name}
                </button>
              </li>
            ))}
            <li className="border-t border-neutral-200 mt-1 pt-1">
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
        );
        return createPortal(dropdown, document.body);
      })()}
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
          MODE: [ {AGENT_MODE_LABELS[mode]} ]
        </span>
      </div>
    </div>
  );
};

export default FocusSwitcher;
