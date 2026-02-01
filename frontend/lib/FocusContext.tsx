import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Focus, FocusStats, Lead, PipelineItem, ActiveGoal, PinnedContext, FocusStatus, FocusTemplateType, FocusTemplateBricks } from '@/types';
import { getDefaultMasterTemplate, getDefaultTemplateBricks } from '@/lib/templateUtils';

const STORAGE_KEY = 'STRATOS_FOCUSES';
const ACTIVE_KEY = 'STRATOS_ACTIVE_FOCUS_ID';

const DEFAULT_STATS: FocusStats = {
  leadsFound: 47,
  outreachSent: 23,
  responseRate: 18,
  highConfidenceMatches: 5,
};

const DEFAULT_GOAL: ActiveGoal = {
  title: '24-Hour March Hackathon',
  target: '$1,000 / 20 Pizzas',
  committedAmount: 650,
  pendingAmount: 350,
  totalAmount: 1000,
};

const DEFAULT_LEADS: Lead[] = [
  { id: '1', confidenceScore: 92, companyName: 'Acme Labs', leadName: 'Sarah Chen', draftReady: true, tier: 1, contactEmail: 'marketing@acmelabs.com', industry: 'Tech / SaaS', funding: '$5K–$15K', contactTitle: 'Head of Marketing', verified: true },
  { id: '2', confidenceScore: 88, companyName: 'TechFlow Inc', leadName: 'Marcus Webb', draftReady: true, tier: 1, contactEmail: 'partnerships@techflow.com', industry: 'Software', funding: '$10K–$25K', contactTitle: 'Partnerships Lead', verified: true },
  { id: '3', confidenceScore: 85, companyName: 'Local Pizza Co', leadName: 'Jen Park', draftReady: true, tier: 1, contactEmail: 'jen@localpizza.com', industry: 'Food & Beverage', funding: 'In-kind', contactTitle: 'Owner', verified: false },
  { id: '4', confidenceScore: 81, companyName: 'DevTools LLC', leadName: 'Alex Rivera', draftReady: true, tier: 2, contactEmail: 'alex@devtools.io' },
  { id: '5', confidenceScore: 78, companyName: 'Campus Eats', leadName: 'Jordan Lee', draftReady: true, tier: 2, contactEmail: 'jordan@campuseats.com' },
];

const DEFAULT_PIPELINE: PipelineItem[] = [
  { id: 'p1', name: 'Emma Davis', company: 'CloudNine', stage: 'researching', updatedAt: '2m ago' },
  { id: 'p2', name: 'Chris Moore', company: 'StartupHub', stage: 'researching', updatedAt: '5m ago' },
  { id: 'p3', name: 'Sarah Chen', company: 'Acme Labs', stage: 'review', updatedAt: '1h ago' },
  { id: 'p4', name: 'Marcus Webb', company: 'TechFlow Inc', stage: 'review', updatedAt: '2h ago' },
  { id: 'p5', name: 'Lisa Wong', company: 'DataDriven', stage: 'waiting', updatedAt: '1d ago' },
  { id: 'p6', name: 'Tom Harris', company: 'CodeCraft', stage: 'waiting', updatedAt: '2d ago' },
  { id: 'p7', name: 'Nina Patel', company: 'SponsorX', stage: 'closed', updatedAt: '3d ago' },
];

function makeFocus(
  id: string,
  name: string,
  ask: string,
  targetProfile: string,
  deadline: string | null,
  pinnedContexts: PinnedContext[],
  status: FocusStatus,
  targetTags: string[] = [],
  templateType: FocusTemplateType = 'sponsorship',
  overrides?: Partial<Pick<Focus, 'goal' | 'stats' | 'leads' | 'pipeline' | 'masterTemplate' | 'templateType' | 'templateBricks'>>
): Focus {
  const type = overrides?.templateType ?? templateType;
  const defaultTemplate = getDefaultMasterTemplate(type);
  const defaultBricks = getDefaultTemplateBricks(type);
  return {
    id,
    name,
    ask,
    targetProfile,
    targetTags,
    deadline,
    pinnedContexts,
    templateType: type,
    masterTemplate: overrides?.masterTemplate ?? defaultTemplate,
    defaultMasterTemplate: defaultTemplate,
    templateBricks: overrides?.templateBricks ?? defaultBricks,
    status,
    goal: overrides?.goal ?? { ...DEFAULT_GOAL, title: name },
    stats: overrides?.stats ?? DEFAULT_STATS,
    leads: overrides?.leads ?? DEFAULT_LEADS,
    pipeline: overrides?.pipeline ?? DEFAULT_PIPELINE,
  };
}

const DEFAULT_FOCUSES: Focus[] = [
  makeFocus(
    'f1',
    'March Hackathon',
    '$1,000 / 20 Pizzas',
    'Local Tech Founders, Event Spaces',
    '2026-03-15',
    [{ id: 'pc1', label: 'Discord: Technical Interest Groups', source: 'discord' }],
    'active',
    ['Local Business', 'Tech'],
    'sponsorship'
  ),
  makeFocus(
    'f2',
    'Spring Social',
    'Venue + catering',
    'Campus clubs, Local vendors',
    null,
    [],
    'draft',
    [],
    'collaboration'
  ),
  makeFocus(
    'f3',
    'General Sponsors',
    'Ongoing funding',
    'Tech companies, Alumni',
    null,
    [{ id: 'pc2', label: 'Google Drive: Sponsorship Deck', source: 'gdrive' }],
    'paused',
    ['Local Business', 'Tech', 'Alumni'],
    'sponsorship'
  ),
];

function migrateFocus(f: Record<string, unknown>): Focus {
  const base = f as unknown as Focus;
  const templateType: FocusTemplateType = base.templateType === 'collaboration' ? 'collaboration' : 'sponsorship';
  const defaultTemplate = getDefaultMasterTemplate(templateType);
  const defaultBricks = getDefaultTemplateBricks(templateType);
  const rawBricks = base.templateBricks as (FocusTemplateBricks & { ctaOptions?: string[]; defaultCta?: string }) | undefined;
  let templateBricks: FocusTemplateBricks;
  if (rawBricks && 'defaultCta' in rawBricks) {
    templateBricks = {
      greeting: (rawBricks as FocusTemplateBricks).greeting ?? defaultBricks.greeting,
      hookInstructions: rawBricks.hookInstructions ?? defaultBricks.hookInstructions,
      credibility: rawBricks.credibility ?? defaultBricks.credibility,
      meat: rawBricks.meat ?? defaultBricks.meat,
      cta: rawBricks.defaultCta ?? (rawBricks as { ctaOptions?: string[] }).ctaOptions?.[0] ?? defaultBricks.cta,
      attachments: Array.isArray((rawBricks as { attachments?: string[] }).attachments) ? (rawBricks as { attachments: string[] }).attachments : defaultBricks.attachments,
    };
  } else {
    const existing = rawBricks ?? defaultBricks;
    const hasAll = existing && typeof existing === 'object' && 'greeting' in existing && 'attachments' in existing;
    templateBricks = hasAll
      ? (existing as FocusTemplateBricks)
      : { ...defaultBricks, ...(typeof existing === 'object' && existing ? existing : {}), attachments: Array.isArray((existing as { attachments?: string[] })?.attachments) ? (existing as { attachments: string[] }).attachments : defaultBricks.attachments };
  }
  return {
    ...base,
    targetTags: Array.isArray(base.targetTags) ? base.targetTags : [],
    status: base.status ?? 'active',
    templateType,
    masterTemplate: typeof base.masterTemplate === 'string' ? base.masterTemplate : defaultTemplate,
    defaultMasterTemplate: defaultTemplate,
    templateBricks,
  };
}

function loadFocuses(): Focus[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (parsed as Record<string, unknown>[]).map(migrateFocus);
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_FOCUSES;
}

function loadActiveId(focuses: Focus[]): string {
  try {
    const id = localStorage.getItem(ACTIVE_KEY);
    if (id && focuses.some((f) => f.id === id)) return id;
  } catch {
    // ignore
  }
  return focuses[0]?.id ?? '';
}

function saveFocuses(focuses: Focus[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(focuses));
  } catch {
    // ignore
  }
}

function saveActiveId(id: string) {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    // ignore
  }
}

type FocusContextValue = {
  focuses: Focus[];
  activeFocusId: string;
  activeFocus: Focus | null;
  setActiveFocus: (id: string) => void;
  createFocus: (focus: Omit<Focus, 'id'> | Partial<Focus>) => Focus;
  updateFocus: (id: string, patch: Partial<Focus>) => void;
  deleteFocus: (id: string) => void;
  getFocus: (id: string) => Focus | null;
  getAttachmentFiles: (focusId: string) => File[];
  setAttachmentFiles: (focusId: string, files: File[]) => void;
  getLeadAttachmentFiles: (focusId: string, leadId: string) => File[];
  setLeadAttachmentFiles: (focusId: string, leadId: string, files: File[]) => void;
};

const FocusContext = createContext<FocusContextValue | null>(null);

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [focuses, setFocuses] = useState<Focus[]>(loadFocuses);
  const [activeFocusId, setActiveFocusIdState] = useState<string>(() =>
    loadActiveId(loadFocuses())
  );
  const [attachmentFilesByFocusId, setAttachmentFilesByFocusId] = useState<Record<string, File[]>>({});
  const [attachmentFilesByLeadId, setAttachmentFilesByLeadId] = useState<Record<string, File[]>>({});

  const setActiveFocus = useCallback((id: string) => {
    setFocuses((prev) => {
      if (!prev.some((f) => f.id === id)) return prev;
      return prev;
    });
    setActiveFocusIdState(id);
    saveActiveId(id);
  }, []);

  const persistFocuses = useCallback((next: Focus[]) => {
    setFocuses(next);
    saveFocuses(next);
  }, []);

  const createFocus = useCallback(
    (input: Omit<Focus, 'id'> | Partial<Focus>): Focus => {
      const id = 'f_' + Date.now();
      const templateType = input.templateType === 'collaboration' ? 'collaboration' : 'sponsorship';
      const defaultTemplate = getDefaultMasterTemplate(templateType);
      const defaultBricks = getDefaultTemplateBricks(templateType);
      const focus: Focus = {
        id,
        name: input.name ?? 'New Focus',
        ask: input.ask ?? '',
        targetProfile: input.targetProfile ?? '',
        targetTags: input.targetTags ?? [],
        deadline: input.deadline ?? null,
        pinnedContexts: input.pinnedContexts ?? [],
        templateType,
        masterTemplate: input.masterTemplate ?? defaultTemplate,
        defaultMasterTemplate: defaultTemplate,
        templateBricks: input.templateBricks ?? defaultBricks,
        status: input.status ?? 'draft',
        goal: input.goal ?? { ...DEFAULT_GOAL, title: input.name ?? 'New Focus' },
        stats: input.stats ?? DEFAULT_STATS,
        leads: input.leads ?? DEFAULT_LEADS,
        pipeline: input.pipeline ?? DEFAULT_PIPELINE,
      };
      setFocuses((prev) => {
        const next = [...prev, focus];
        saveFocuses(next);
        return next;
      });
      setActiveFocusIdState(id);
      saveActiveId(id);
      return focus;
    },
    []
  );

  const updateFocus = useCallback(
    (id: string, patch: Partial<Focus>) => {
      setFocuses((prev) => {
        const idx = prev.findIndex((f) => f.id === id);
        if (idx < 0) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], ...patch };
        saveFocuses(next);
        return next;
      });
    },
    []
  );

  const deleteFocus = useCallback(
    (id: string) => {
      setFocuses((prev) => {
        const next = prev.filter((f) => f.id !== id);
        saveFocuses(next);
        if (activeFocusId === id && next.length > 0) {
          const newActive = next[0].id;
          saveActiveId(newActive);
          setActiveFocusIdState(newActive);
        }
        return next;
      });
    },
    [activeFocusId]
  );

  const getFocus = useCallback(
    (id: string) => focuses.find((f) => f.id === id) ?? null,
    [focuses]
  );

  const getAttachmentFiles = useCallback(
    (focusId: string) => attachmentFilesByFocusId[focusId] ?? [],
    [attachmentFilesByFocusId]
  );

  const setAttachmentFiles = useCallback((focusId: string, files: File[]) => {
    setAttachmentFilesByFocusId((prev) => ({ ...prev, [focusId]: files }));
  }, []);

  const leadAttachmentKey = (focusId: string, leadId: string) => `${focusId}:${leadId}`;
  const getLeadAttachmentFiles = useCallback(
    (focusId: string, leadId: string) =>
      attachmentFilesByLeadId[leadAttachmentKey(focusId, leadId)] ?? [],
    [attachmentFilesByLeadId]
  );

  const setLeadAttachmentFiles = useCallback((focusId: string, leadId: string, files: File[]) => {
    setAttachmentFilesByLeadId((prev) => ({
      ...prev,
      [leadAttachmentKey(focusId, leadId)]: files,
    }));
  }, []);

  const activeFocus = useMemo(
    () => focuses.find((f) => f.id === activeFocusId) ?? focuses[0] ?? null,
    [focuses, activeFocusId]
  );

  const value = useMemo(
    () => ({
      focuses,
      activeFocusId,
      activeFocus,
      setActiveFocus,
      createFocus,
      updateFocus,
      deleteFocus,
      getFocus,
      getAttachmentFiles,
      setAttachmentFiles,
      getLeadAttachmentFiles,
      setLeadAttachmentFiles,
    }),
    [
      focuses,
      activeFocusId,
      activeFocus,
      setActiveFocus,
      createFocus,
      updateFocus,
      deleteFocus,
      getFocus,
      getAttachmentFiles,
      setAttachmentFiles,
      getLeadAttachmentFiles,
      setLeadAttachmentFiles,
    ]
  );

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocus(): FocusContextValue {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error('useFocus must be used within FocusProvider');
  return ctx;
}
