
export enum LeadStatus {
  DRAFTED = 'Drafted',
  NOT_CONTACTED = 'Not Contacted',
  REPLIED = 'Replied',
  SENT = 'Sent',
  BOUNCED = 'Bounced'
}

export interface Lead {
  id: string;
  company: string;
  initial: string;
  status: LeadStatus;
  lastActivity: string;
  research: {
    funding: string;
    stack: string;
    decisionMaker: string;
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
