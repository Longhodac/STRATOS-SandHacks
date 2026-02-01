import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useClubProfile } from '@/lib/ClubProfileContext';
import { useFocus } from '@/lib/FocusContext';
import { useFocusModal } from '@/lib/FocusModalContext';
import { useTemplateModal } from '@/lib/TemplateModalContext';
import FocusSwitcher from '@/components/FocusSwitcher';
import type {
  ActiveGoal,
  Lead,
  PipelineItem,
  PipelineStage,
} from '@/types';

const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  researching: 'Researching',
  review: 'Review Required',
  waiting: 'Waiting for Reply',
  closed: 'Closed/Partnered',
};

function FocusHeader({
  goal,
  onNewFocus,
}: {
  goal: ActiveGoal;
  onNewFocus: () => void;
}) {
  const committedPct = goal.totalAmount
    ? Math.round((goal.committedAmount / goal.totalAmount) * 100)
    : 0;
  return (
    <header className="border-b border-border pb-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <FocusSwitcher onNewFocus={onNewFocus} />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 bg-muted rounded-sm overflow-hidden">
            <div
              className="h-full bg-primary rounded-sm transition-[width]"
              style={{ width: `${committedPct}%` }}
            />
          </div>
          <span className="text-xs font-mono text-muted-foreground shrink-0">
            {committedPct}% Committed · {goal.pendingAmount} Pending
          </span>
        </div>
      </div>
    </header>
  );
}

function QuickStatsRow({ stats }: { stats: { leadsFound: number; outreachSent: number; responseRate: number; highConfidenceMatches: number } }) {
  const items = [
    { label: 'Leads Found', value: stats.leadsFound },
    { label: 'Outreach Sent', value: stats.outreachSent },
    { label: 'Response Rate', value: `${stats.responseRate}%` },
    { label: 'High-Confidence Matches', value: stats.highConfidenceMatches },
  ];
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(({ label, value }) => (
        <Card key={label} className="rounded-sm border-border">
          <CardContent className="p-4">
            <span className="text-2xl font-light text-foreground font-display tracking-tight">
              {value}
            </span>
            <p className="text-[10px] text-muted-foreground font-mono uppercase mt-1">{label}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function ActionQueue({ leads }: { leads: Lead[] }) {
  return (
    <Card className="rounded-sm border-border flex flex-col">
      <CardHeader className="px-5 py-3 border-b border-border">
        <CardTitle className="font-normal text-muted-foreground text-xs font-mono uppercase tracking-wide">
          Action Queue
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <ul className="divide-y divide-border">
          {leads.slice(0, 5).map((lead) => (
            <li
              key={lead.id}
              className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
            >
              <span className="text-xs font-mono text-foreground w-8 shrink-0">
                {lead.confidenceScore}%
              </span>
              <span className="text-sm font-mono text-muted-foreground">|</span>
              <span className="text-sm truncate flex-1 min-w-0">{lead.companyName}</span>
              <span className="text-sm text-muted-foreground truncate w-24">{lead.leadName}</span>
              <Button variant="default" size="sm" className="font-mono text-xs shrink-0">
                {lead.draftReady ? 'SEND' : 'REVIEW'}
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function DraftsColumn({
  focusId,
  leads,
  onEditMasterTemplate,
}: {
  focusId: string;
  leads: Lead[];
  onEditMasterTemplate: () => void;
}) {
  return (
    <Card className="rounded-sm border-border flex flex-col">
      <CardHeader className="px-5 py-3 border-b border-border flex flex-row items-center justify-between gap-2">
        <CardTitle className="font-normal text-muted-foreground text-xs font-mono uppercase tracking-wide">
          Drafts
        </CardTitle>
        <Button
          variant="default"
          size="sm"
          className="font-mono text-xs shrink-0 bg-black text-white hover:bg-black/90"
          onClick={onEditMasterTemplate}
        >
          Edit Master Template
        </Button>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <ScrollArea className="h-[280px]">
          <ul className="divide-y divide-border">
            {leads.slice(0, 8).map((lead) => (
              <li key={lead.id} className="px-5 py-3 hover:bg-muted/30">
                <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">
                  {lead.companyName} · {lead.leadName}
                </p>
                <p className="text-xs font-mono text-foreground line-clamp-3 whitespace-pre-wrap">
                  {lead.draftText || '— No draft yet —'}
                </p>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ContextSnapshot({
  missionStatement,
  interests,
}: {
  missionStatement: string;
  interests: string[];
}) {
  return (
    <Card className="rounded-sm border-border flex flex-col">
      <CardHeader className="px-5 py-3 border-b border-border">
        <CardTitle className="font-normal text-muted-foreground text-xs font-mono uppercase tracking-wide">
          Context Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 flex flex-col gap-5">
        <div>
          <p className="text-[10px] text-muted-foreground font-mono uppercase mb-2">
            Mission Statement
          </p>
          <p className="text-sm text-foreground font-mono leading-relaxed">
            {missionStatement || '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-mono uppercase mb-2">
            Active Interests
          </p>
          <div className="flex flex-wrap gap-1.5">
            {interests.map((tag) => (
              <Badge key={tag} variant="secondary" className="font-mono text-[10px] font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OutreachPipeline({ items }: { items: PipelineItem[] }) {
  const stages: PipelineStage[] = ['researching', 'review', 'waiting', 'closed'];
  return (
    <section className="w-full">
      <h2 className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide mb-3">
        Outreach Pipeline
      </h2>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-2 min-w-max">
          {stages.map((stage) => {
            const stageItems = items.filter((i) => i.stage === stage);
            return (
              <div
                key={stage}
                className="w-48 shrink-0 rounded-sm border border-border bg-card flex flex-col"
              >
                <div className="px-3 py-2 border-b border-border">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {PIPELINE_STAGE_LABELS[stage]}
                  </span>
                </div>
                <ScrollArea className="h-32">
                  <ul className="p-2 space-y-1">
                    {stageItems.map((item) => (
                      <li
                        key={item.id}
                        className="text-xs font-mono p-2 rounded border border-border bg-background/50"
                      >
                        <p className="truncate font-medium">{item.company}</p>
                        <p className="truncate text-muted-foreground">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.updatedAt}</p>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </section>
  );
}

const Home: React.FC = () => {
  const { profile } = useClubProfile();
  const { activeFocus } = useFocus();
  const { openFocusModal } = useFocusModal();
  const { openTemplateModal } = useTemplateModal();

  if (!activeFocus) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground font-mono text-sm">
        No focus selected. Create one from the New Focus button in the focus dropdown.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          <FocusHeader goal={activeFocus.goal} onNewFocus={() => openFocusModal(null)} />
          <QuickStatsRow stats={activeFocus.stats} />
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <ActionQueue leads={activeFocus.leads} />
            </div>
            <div>
              <DraftsColumn
                focusId={activeFocus.id}
                leads={activeFocus.leads}
                onEditMasterTemplate={() => openTemplateModal(activeFocus.id)}
              />
            </div>
            <div>
              <ContextSnapshot missionStatement={profile.missionStatement} interests={profile.interests} />
            </div>
          </section>
          <OutreachPipeline items={activeFocus.pipeline} />
        </div>
      </div>
    </div>
  );
};

export default Home;
