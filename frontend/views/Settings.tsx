import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useClubProfile } from '@/lib/ClubProfileContext';

const Settings: React.FC = () => {
  const { profile, setProfile, addInterest, removeInterest } = useClubProfile();
  const [newInterest, setNewInterest] = useState('');

  const handleAddInterest = () => {
    addInterest(newInterest);
    setNewInterest('');
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full px-8 py-10 flex flex-col gap-10">
        <header className="flex flex-col gap-3 pb-4 border-b border-border">
          <h1 className="text-3xl font-bold text-foreground tracking-tight font-display">System Configuration</h1>
          <p className="text-muted-foreground text-base max-w-2xl">Manage integration behavior, privacy boundaries, and AI interaction parameters.</p>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-foreground font-display border-b border-border pb-2">Club Profile</h2>
          <p className="text-muted-foreground text-sm">This profile drives the Context Snapshot on the Home dashboard (mission statement and active interests).</p>
          <Card className="rounded-sm border-border">
            <CardContent className="p-6 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Club Name</label>
                <Input
                  className="font-mono"
                  value={profile.clubName}
                  onChange={(e) => setProfile((p) => ({ ...p, clubName: e.target.value }))}
                  placeholder="My Club"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Mission Statement</label>
                <Textarea
                  className="font-mono text-sm min-h-24 resize-none"
                  value={profile.missionStatement}
                  onChange={(e) => setProfile((p) => ({ ...p, missionStatement: e.target.value }))}
                  placeholder="Describe your club's mission and goals..."
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Active Interests</label>
                <p className="text-xs text-muted-foreground">Tags the agent uses to describe your club. Shown as a tag cloud in the Context Snapshot.</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {profile.interests.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="font-mono text-xs font-normal cursor-pointer gap-1 pr-1"
                      onClick={() => removeInterest(tag)}
                    >
                      {tag}
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    className="font-mono flex-1"
                    placeholder="Add interest (e.g. Web3, Python)"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())}
                  />
                  <Button variant="outline" size="sm" className="font-mono" onClick={handleAddInterest}>
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-foreground font-display border-b border-border pb-2">Integrations</h2>
          <Card className="rounded-sm border-border overflow-hidden gap-0">
            {[
              { label: 'Google Drive', detail: 'Synced: 23m ago', active: true, icon: 'add_to_drive' },
              { label: 'Discord Community', detail: 'Listening on #general', active: true, icon: 'forum' },
              { label: 'GitHub Repository', detail: 'Not connected', active: false, icon: 'code' }
            ].map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Separator />}
                <CardContent className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-background border border-border rounded-sm text-muted-foreground">
                      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">{item.label}</span>
                      <span className="text-xs text-muted-foreground font-mono">{item.detail}</span>
                    </div>
                  </div>
                  <div>
                    {item.active ? (
                      <span className="text-[10px] text-green-500 font-mono font-bold">ACTIVE</span>
                    ) : (
                      <Button variant="outline" size="sm" className="text-[10px] font-mono rounded-sm">CONNECT</Button>
                    )}
                  </div>
                </CardContent>
              </React.Fragment>
            ))}
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-foreground font-display border-b border-border pb-2">Privacy & Exclusion</h2>
          <Card className="rounded-sm border-border">
            <CardContent className="p-6 flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-foreground">Excluded Drive Paths</label>
                <Textarea
                  className="w-full h-32 font-mono text-muted-foreground text-xs rounded-sm min-h-32"
                  defaultValue={"/finance/quarterly-reports/*\n/legal/contracts/drafts/*"}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Card className="rounded-sm border-border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <span className="text-sm text-foreground">PII Scrubbing</span>
                    <span className="text-xs font-mono text-muted-foreground">On</span>
                  </CardContent>
                </Card>
                <Card className="rounded-sm border-border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <span className="text-sm text-foreground">Ephemeral Mode</span>
                    <span className="text-xs font-mono text-muted-foreground">Off</span>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </section>

        <div className="flex justify-end gap-4 pt-6 pb-12 border-t border-border">
          <Button variant="ghost" size="sm" className="font-mono text-muted-foreground hover:text-foreground">DISCARD</Button>
          <Button size="sm" className="font-mono rounded-sm">SAVE_CHANGES</Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
