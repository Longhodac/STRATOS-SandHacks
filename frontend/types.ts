
export enum ClubStatus {
  DRAFTED = 'Drafted',
  NOT_CONTACTED = 'Not Contacted',
  REPLIED = 'Replied',
  SENT = 'Sent',
  BOUNCED = 'Bounced'
}

export interface Club {
  id: string;
  name: string;
  initial: string;
  status: ClubStatus;
  lastActivity: string;
  research: {
    memberCount: string;
    meetingTime: string;
    contact: string;
    verified: boolean;
  };
  draft?: string;
}

export enum SponsorStatus {
  DRAFTED = 'Drafted',
  NOT_CONTACTED = 'Not Contacted',
  REPLIED = 'Replied',
  SENT = 'Sent',
  BOUNCED = 'Bounced'
}

export interface Sponsor {
  id: string;
  company: string;
  initial: string;
  status: SponsorStatus;
  lastActivity: string;
  research: {
    funding: string;
    industry: string;
    contact: string;
    verified: boolean;
  };
  draft?: string;
}

export interface ParsedEntity {
  label: string;
  value: string;
}

export interface OutreachSlot {
  id: string;
  time: string;
  timezone: string;
  title: string;
  duration: string;
  reason: string;
  fitScore: number;
  recommended: boolean;
}

export type HookTone = 'professional' | 'short_punchy' | 'student_to_recruiter';

export interface Lead {
  id: string;
  confidenceScore: number;
  companyName: string;
  leadName: string;
  draftReady: boolean;
  tier: 1 | 2 | 3;
  draftText?: string;
  contactEmail?: string;
  hook?: string;
  hookReasoning?: string;
  meatOverride?: string;
  cta?: string;
}

export interface FocusTemplateBricks {
  greeting: string;
  hookInstructions: string;
  credibility: string;
  meat: string;
  cta: string;
  attachments: string[];
}

export type FocusTemplateType = 'sponsorship' | 'collaboration';

export const FOCUS_TEMPLATE_TAGS: Record<FocusTemplateType, string[]> = {
  sponsorship: ['focus_name', 'ask_amount', 'sponsor_benefits', 'company_name', 'lead_name'],
  collaboration: ['focus_name', 'shared_interest', 'available_date', 'mutual_exchange', 'company_name', 'lead_name'],
};

export type PipelineStage = 'researching' | 'review' | 'waiting' | 'closed';

export interface PipelineItem {
  id: string;
  name: string;
  company: string;
  stage: PipelineStage;
  updatedAt: string;
}

export interface AgentActivity {
  id: string;
  timestamp: Date;
  agentType: 'research' | 'context' | 'outreach';
  message: string;
}

export interface ActiveGoal {
  title: string;
  target: string;
  committedAmount: number;
  pendingAmount: number;
  totalAmount: number;
}

export interface ClubProfile {
  clubName: string;
  missionStatement: string;
  interests: string[];
}

export interface PinnedContext {
  id: string;
  label: string;
  source: string;
}

export interface FocusStats {
  leadsFound: number;
  outreachSent: number;
  responseRate: number;
  highConfidenceMatches: number;
}

export type FocusStatus = 'active' | 'draft' | 'paused' | 'archived';

export interface Focus {
  id: string;
  name: string;
  ask: string;
  targetProfile: string;
  targetTags: string[];
  deadline: string | null;
  pinnedContexts: PinnedContext[];
  templateType: FocusTemplateType;
  masterTemplate: string;
  defaultMasterTemplate?: string;
  templateBricks?: FocusTemplateBricks;
  goal: ActiveGoal;
  stats: FocusStats;
  leads: Lead[];
  pipeline: PipelineItem[];
  status: FocusStatus;
}
