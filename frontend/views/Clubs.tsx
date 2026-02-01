import React, { useState } from 'react';
import { Club, ClubStatus } from '../types';
import { generateDraft } from '../services/geminiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const MOCK_CLUBS: Club[] = [
  { id: '#1001', name: 'Computer Science Club', initial: 'CS', status: ClubStatus.DRAFTED, lastActivity: '2h ago', research: { memberCount: '45 members', meetingTime: 'Tue/Thu 5PM', contact: 'Jane Kim, President', verified: true } },
  { id: '#1002', name: 'Robotics Team', initial: 'R', status: ClubStatus.NOT_CONTACTED, lastActivity: '--', research: { memberCount: '32 members', meetingTime: 'Mon/Wed 4PM', contact: 'Alex Chen, Captain', verified: false } },
  { id: '#1003', name: 'Design & UX Club', initial: 'D', status: ClubStatus.REPLIED, lastActivity: '1d ago', research: { memberCount: '28 members', meetingTime: 'Wed 6PM', contact: 'Sam Lee, Lead', verified: true } },
  { id: '#1004', name: 'Game Dev Society', initial: 'G', status: ClubStatus.SENT, lastActivity: '3d ago', research: { memberCount: '50 members', meetingTime: 'Fri 4PM', contact: 'Jordan Taylor, President', verified: true } },
];

const Clubs: React.FC = () => {
  const [clubs, setClubs] = useState<Club[]>(MOCK_CLUBS);
  const [selectedId, setSelectedId] = useState<string | null>(clubs[0].id);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedClub = clubs.find(c => c.id === selectedId) || clubs[0];

  const handleGenerate = async () => {
    if (!selectedClub) return;
    setIsGenerating(true);
    try {
      const draft = await generateDraft(selectedClub.name, selectedClub.research);
      setClubs(prev => prev.map(c => c.id === selectedId ? { ...c, draft, status: ClubStatus.DRAFTED } : c));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col bg-background border-r border-border min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background shrink-0">
          <h2 className="text-lg font-bold text-foreground font-display tracking-tight">Club Collaboration Management</h2>
          <div className="flex items-center gap-3">
            <Input className="w-48 font-mono h-8 rounded-sm" placeholder="Filter..." />
            <Button size="sm" className="font-mono uppercase rounded-sm">NEW</Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="px-6 py-3 text-[10px] uppercase text-muted-foreground font-mono tracking-widest font-normal">Club Name</TableHead>
                <TableHead className="px-6 py-3 text-[10px] uppercase text-muted-foreground font-mono tracking-widest font-normal">Status</TableHead>
                <TableHead className="px-6 py-3 text-[10px] uppercase text-muted-foreground font-mono tracking-widest font-normal">Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clubs.map((club) => (
                <TableRow
                  key={club.id}
                  onClick={() => setSelectedId(club.id)}
                  className={cn(
                    'cursor-pointer border-border',
                    selectedId === club.id ? 'bg-muted border-l-2 border-l-primary' : 'hover:bg-muted border-l-2 border-l-transparent'
                  )}
                >
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-sm bg-muted flex items-center justify-center text-foreground font-mono text-xs border border-border">{club.initial}</div>
                      <div>
                        <p className="text-foreground font-medium text-sm font-mono leading-none">{club.name}</p>
                        <p className="text-muted-foreground text-[10px] mt-1 font-mono uppercase">{club.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge variant="secondary" className="rounded-sm font-mono text-[10px]">{club.status}</Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-muted-foreground font-mono text-xs">{club.lastActivity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <aside className="w-[480px] bg-background flex flex-col shrink-0">
        <div className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="font-bold text-foreground text-base font-mono tracking-wide">{selectedClub.name}</h3>
          <Button variant="ghost" size="icon" className="rounded-sm size-8">
            <span className="material-symbols-outlined text-muted-foreground text-[20px]">close</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Research Facts</h4>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border border border-border rounded-sm overflow-hidden">
              <Card className="rounded-none border-0 bg-background">
                <CardContent className="p-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1 font-mono">Members</p>
                  <p className="text-sm font-medium text-foreground">{selectedClub.research.memberCount}</p>
                </CardContent>
              </Card>
              <Card className="rounded-none border-0 bg-background">
                <CardContent className="p-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1 font-mono">Meetings</p>
                  <p className="text-sm font-medium text-foreground">{selectedClub.research.meetingTime}</p>
                </CardContent>
              </Card>
              <Card className="rounded-none border-0 bg-background col-span-2">
                <CardContent className="p-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1 font-mono">Contact</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{selectedClub.research.contact}</p>
                    {selectedClub.research.verified && (
                      <span className="text-[10px] text-green-500 font-mono uppercase">VERIFIED</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Draft Editor</h4>
              <Button
                variant="link"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="text-foreground text-[10px] font-mono uppercase h-auto p-0"
              >
                {isGenerating ? 'GEN_IN_PROGRESS...' : 'AI_REFRESH'}
              </Button>
            </div>
            <Card className="rounded-sm border-border flex-1 overflow-hidden">
              <Textarea
                className="w-full h-full min-h-[200px] bg-transparent border-0 text-foreground resize-none font-mono leading-relaxed rounded-none focus-visible:ring-0"
                value={selectedClub.draft || "// No draft content. Click AI_REFRESH to generate."}
                onChange={(e) => setClubs(prev => prev.map(c => c.id === selectedId ? { ...c, draft: e.target.value } : c))}
                spellCheck={false}
              />
            </Card>
          </section>
        </div>

        <div className="p-4 border-t border-border flex justify-between items-center bg-background shrink-0">
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive font-mono text-xs uppercase h-auto">Delete</Button>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="font-mono text-xs uppercase rounded-sm">Save</Button>
            <Button size="sm" className="font-mono text-xs uppercase rounded-sm">Send Proposal</Button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Clubs;
