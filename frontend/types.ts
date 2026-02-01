
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

// Agent research types for Lead integration
export interface LeadResearchedEmail {
  email: string;
  purpose: string;
  confidence: string;
  source_url: string;
  evidence_quote: string;
}

export interface LeadContactPage {
  url: string;
  page_type: string;
}

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
  industry?: string;
  funding?: string;
  contactTitle?: string;
  verified?: boolean;
  // Agent research data
  domain?: string;
  researchedEmails?: LeadResearchedEmail[];
  contactPages?: LeadContactPage[];
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

export type AgentMode = 'discovery' | 'research' | 'drafting' | 'strategy';

export const AGENT_MODE_LABELS: Record<AgentMode, string> = {
  discovery: 'HUNTER',
  research: 'ANALYST',
  drafting: 'WRITER',
  strategy: 'ARCHITECT',
};

export const AGENT_MODE_DESCRIPTIONS: Record<AgentMode, string> = {
  discovery: 'Find and qualify new leads.',
  research: 'Deep-dive on a selected lead.',
  drafting: 'Edit templates and personalize drafts.',
  strategy: 'Plan goals and next steps.',
};

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

// ==================== Agent Types ====================

export type AgentTab = 'discovery' | 'research' | 'scraper';

export const AGENT_TAB_LABELS: Record<AgentTab, string> = {
  discovery: 'Company Discovery',
  research: 'Email Research',
  scraper: 'Website Scraper',
};

export const AGENT_TAB_DESCRIPTIONS: Record<AgentTab, string> = {
  discovery: 'Find companies by industry keyword using AI',
  research: 'Research company emails using Perplexity',
  scraper: 'Scrape websites for email addresses',
};

// Re-export agent types from service for convenience
export type {
  DiscoveredCompany,
  DiscoveryRun,
  DiscoveryResult,
  ResearchedEmail,
  ResearchedCompany,
  ResearchedCompanyListItem,
  ScrapedEmail,
  ScrapeResult,
  ScrapeHistoryItem,
  HealthStatus,
} from './services/agentsService';

// ==================== LLM Provider Types ====================

export type LLMProvider = 'groq';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMFunctionCall {
  name: string;
  arguments: Record<string, any>;
}

export interface LLMResponse {
  text: string;
  functionCall?: LLMFunctionCall;
}

export interface AgentFunctionContext {
  activeFocus: Focus | null;
  selectedLead: Lead | null;
  clubProfile: ClubProfile;
}

export interface AgentFunctionResult {
  success: boolean;
  result: any;
  message: string;
  navigateTo?: string;
}
