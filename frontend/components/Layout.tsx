import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useClubProfile } from '@/lib/ClubProfileContext';
import { FocusModalProvider } from '@/lib/FocusModalContext';
import { TemplateModalProvider } from '@/lib/TemplateModalContext';
import FocusEditModal from '@/components/FocusEditModal';
import TemplateEditModal from '@/components/TemplateEditModal';

type NavItem =
  | { id: string; label: string; path: string; children?: never }
  | { id: string; label: string; path: null; children: { id: string; label: string; path: string }[] };

const navItems: NavItem[] = [
  { id: '01', label: 'DASHBOARD', path: '/' },
  { id: '02', label: 'OBJECTIVES', path: '/objectives' },
  {
    id: '03',
    label: 'OUTREACH',
    path: null,
    children: [
      { id: '03a', label: 'CLUBS', path: '/clubs' },
      { id: '03b', label: 'SPONSORS', path: '/sponsors' },
    ],
  },
  { id: '04', label: 'ADVISOR', path: '/advisor' },
  { id: '05', label: 'SETTINGS', path: '/settings' },
];

function clubInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (name.length >= 2) return name.slice(0, 2).toUpperCase();
  return name.slice(0, 1).toUpperCase() || '—';
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { profile } = useClubProfile();
  const [outreachExpanded, setOutreachExpanded] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFocusId, setModalFocusId] = useState<string | null>(null);
  const [templateModalFocusId, setTemplateModalFocusId] = useState<string | null>(null);

  const openFocusModal = useCallback((focusId: string | null) => {
    setModalFocusId(focusId);
    setModalOpen(true);
  }, []);

  const openTemplateModal = useCallback((focusId: string) => {
    setTemplateModalFocusId(focusId);
  }, []);

  const isOutreachPath = location.pathname === '/clubs' || location.pathname === '/sponsors';

  useEffect(() => {
    if (isOutreachPath) setOutreachExpanded(true);
  }, [isOutreachPath]);

  return (
    <FocusModalProvider openFocusModal={openFocusModal}>
      <TemplateModalProvider openTemplateModal={openTemplateModal}>
      <div className="flex h-screen w-full bg-background overflow-hidden font-body">
      <aside className="w-16 lg:w-64 border-r border-border bg-background flex flex-col justify-between shrink-0 z-20 transition-all duration-300">
        <div className="flex flex-col gap-2 p-3">
          <div className="flex items-center gap-3 mb-6 px-1 lg:px-2 pt-2">
            <div className="bg-primary aspect-square rounded-sm size-8 flex items-center justify-center text-primary-foreground shrink-0">
              <span className="material-symbols-outlined text-[20px] font-bold">hub</span>
            </div>
            <div className="flex-col hidden lg:flex">
              <h1 className="text-foreground text-sm font-bold tracking-wider font-display leading-none">STRATOS</h1>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              if (item.children) {
                return (
                  <div key={item.id} className="flex flex-col gap-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'w-full justify-start font-mono text-xs tracking-wide rounded-sm h-auto py-2',
                        outreachExpanded && 'border border-transparent'
                      )}
                      onClick={() => setOutreachExpanded(!outreachExpanded)}
                    >
                      <span className="hidden lg:block">{item.id} // {item.label}</span>
                      <span className="lg:hidden">{item.id}</span>
                    </Button>
                    {outreachExpanded && (
                      <div className="flex flex-col gap-0 pl-2 lg:pl-4 border-l border-border ml-2 mt-0 mb-1">
                        {item.children.map((child) => (
                          <Button
                            key={child.id}
                            variant={location.pathname === child.path ? 'secondary' : 'ghost'}
                            size="sm"
                            className={cn(
                              'w-full justify-start font-mono text-xs tracking-wide rounded-sm h-auto py-2',
                              location.pathname === child.path && 'border border-border'
                            )}
                            asChild
                          >
                            <Link to={child.path}>
                              <span className="hidden lg:block">{child.label}</span>
                              <span className="lg:hidden">{child.id}</span>
                            </Link>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <Button
                  key={item.id}
                  variant={location.pathname === item.path ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'w-full justify-start font-mono text-xs tracking-wide rounded-sm h-auto py-2',
                    location.pathname === item.path && 'border border-border'
                  )}
                  asChild
                >
                  <Link to={item.path}>
                    <span className="hidden lg:block">{item.id} // {item.label}</span>
                    <span className="lg:hidden">{item.id}</span>
                  </Link>
                </Button>
              );
            })}
          </nav>
        </div>

        <div className="p-3">
          <Separator className="mb-3" />
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="size-8 rounded-sm bg-card overflow-hidden shrink-0 border border-border grayscale flex items-center justify-center">
              <span className="text-[10px] font-mono text-muted-foreground">
                {clubInitials(profile.clubName)}
              </span>
            </div>
            <div className="flex-col hidden lg:flex min-w-0">
              <p className="text-foreground text-xs font-mono font-bold leading-none uppercase truncate">
                {profile.clubName || 'Club'}
              </p>
              <p className="text-muted-foreground text-[10px] font-mono mt-1 uppercase">Club Profile</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {children}
      </main>
      <FocusEditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        focusId={modalFocusId}
      />
      <TemplateEditModal
        open={templateModalFocusId !== null}
        onClose={() => setTemplateModalFocusId(null)}
        focusId={templateModalFocusId}
      />
    </div>
      </TemplateModalProvider>
    </FocusModalProvider>
  );
};

export default Layout;
