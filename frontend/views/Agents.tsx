import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { AgentTab } from '@/types';
import { AGENT_TAB_LABELS, AGENT_TAB_DESCRIPTIONS } from '@/types';
import {
  checkHealth,
  discoverCompanies,
  getDiscoveredCompanies,
  researchCompany,
  getResearchedCompanies,
  scrapeWebsite,
  getScrapeHistory,
  type DiscoveredCompany,
  type ResearchedCompanyListItem,
  type ResearchedCompany,
  type ScrapeResult,
  type ScrapeHistoryItem,
  type HealthStatus,
} from '@/services/agentsService';

const TABS: AgentTab[] = ['discovery', 'research', 'scraper'];

// ==================== Discovery Tab ====================

function DiscoveryTab() {
  const [keyword, setKeyword] = useState('');
  const [region, setRegion] = useState('');
  const [maxCompanies, setMaxCompanies] = useState(25);
  const [isLoading, setIsLoading] = useState(false);
  const [companies, setCompanies] = useState<DiscoveredCompany[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await getDiscoveredCompanies();
      setCompanies(data);
    } catch (e) {
      // Ignore - backend may not be running
    }
  };

  const handleDiscover = async () => {
    if (!keyword.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await discoverCompanies(keyword, region, maxCompanies);
      setCompanies(prev => [...result.companies, ...prev]);
      setKeyword('');
      setRegion('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Discovery failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-sm border-border">
        <CardHeader className="px-5 py-3 border-b border-border">
          <CardTitle className="font-normal text-muted-foreground text-xs font-mono uppercase tracking-wide">
            Discover Companies
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-mono text-muted-foreground block mb-1">Industry Keyword</label>
              <Input
                placeholder="e.g., robotics, fintech, AI"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="w-40">
              <label className="text-xs font-mono text-muted-foreground block mb-1">Region (optional)</label>
              <Input
                placeholder="e.g., California"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="w-24">
              <label className="text-xs font-mono text-muted-foreground block mb-1">Max</label>
              <Input
                type="number"
                value={maxCompanies}
                onChange={(e) => setMaxCompanies(parseInt(e.target.value) || 25)}
                className="font-mono"
              />
            </div>
            <Button
              onClick={handleDiscover}
              disabled={isLoading || !keyword.trim()}
              className="font-mono"
            >
              {isLoading ? 'DISCOVERING...' : 'DISCOVER'}
            </Button>
          </div>
          {error && <p className="text-destructive text-sm mt-2">{error}</p>}
        </CardContent>
      </Card>

      <Card className="rounded-sm border-border">
        <CardHeader className="px-5 py-3 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="font-normal text-muted-foreground text-xs font-mono uppercase tracking-wide">
            Discovered Companies ({companies.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadCompanies} className="font-mono text-xs">
            REFRESH
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-xs">Name</TableHead>
                <TableHead className="font-mono text-xs">Domain</TableHead>
                <TableHead className="font-mono text-xs">Industry</TableHead>
                <TableHead className="font-mono text-xs">Region</TableHead>
                <TableHead className="font-mono text-xs">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No companies discovered yet. Run a discovery search above.
                  </TableCell>
                </TableRow>
              ) : (
                companies.slice(0, 50).map((company, idx) => (
                  <TableRow key={`${company.domain}-${idx}`}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell className="font-mono text-sm">{company.domain}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {company.industry || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{company.region || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {company.description || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Research Tab ====================

function ResearchTab() {
  const [companyName, setCompanyName] = useState('');
  const [domain, setDomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [researchingId, setResearchingId] = useState<string | null>(null);
  const [discoveredCompanies, setDiscoveredCompanies] = useState<DiscoveredCompany[]>([]);
  const [researchedCompanies, setResearchedCompanies] = useState<ResearchedCompanyListItem[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<ResearchedCompany | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isResearchingAll, setIsResearchingAll] = useState(false);
  const [researchAllProgress, setResearchAllProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    loadDiscoveredCompanies();
    loadResearchedCompanies();
  }, []);

  const loadDiscoveredCompanies = async () => {
    try {
      const data = await getDiscoveredCompanies();
      setDiscoveredCompanies(data);
    } catch (e) {
      // Ignore
    }
  };

  const loadResearchedCompanies = async () => {
    try {
      const data = await getResearchedCompanies();
      setResearchedCompanies(data);
    } catch (e) {
      // Ignore
    }
  };

  const handleResearch = async (name?: string, dom?: string) => {
    const targetName = name || companyName.trim();
    const targetDomain = dom || domain.trim();
    
    if (!targetName || !targetDomain) return;
    
    setIsLoading(true);
    setResearchingId(targetDomain);
    setError(null);
    
    try {
      const result = await researchCompany(targetName, targetDomain);
      setSelectedCompany(result);
      loadResearchedCompanies();
      if (!name) {
        setCompanyName('');
        setDomain('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Research failed');
    } finally {
      setIsLoading(false);
      setResearchingId(null);
    }
  };

  // Check if a company has been researched
  const isResearched = (domain: string) => {
    return researchedCompanies.some(c => c.domain === domain);
  };

  // Research all companies that haven't been researched yet
  const handleResearchAll = async () => {
    const unresearched = discoveredCompanies.filter(c => !isResearched(c.domain));
    if (unresearched.length === 0) {
      setError('All companies have already been researched.');
      return;
    }

    setIsResearchingAll(true);
    setResearchAllProgress({ current: 0, total: unresearched.length });
    setError(null);

    for (let i = 0; i < unresearched.length; i++) {
      const company = unresearched[i];
      setResearchAllProgress({ current: i + 1, total: unresearched.length });
      setResearchingId(company.domain);

      try {
        const result = await researchCompany(company.name, company.domain);
        setSelectedCompany(result);
        await loadResearchedCompanies();
      } catch (e) {
        // Continue with next company even if one fails
        console.error(`Failed to research ${company.name}:`, e);
      }

      // Small delay between requests to avoid rate limiting
      if (i < unresearched.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsResearchingAll(false);
    setResearchingId(null);
    setResearchAllProgress({ current: 0, total: 0 });
  };

  return (
    <div className="space-y-6">
      {/* Manual Research Form */}
      <Card className="rounded-sm border-border">
        <CardHeader className="px-5 py-3 border-b border-border">
          <CardTitle className="font-normal text-muted-foreground text-xs font-mono uppercase tracking-wide">
            Research Company Emails (Manual)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-mono text-muted-foreground block mb-1">Company Name</label>
              <Input
                placeholder="e.g., Stripe"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-mono text-muted-foreground block mb-1">Domain</label>
              <Input
                placeholder="e.g., stripe.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="font-mono"
              />
            </div>
            <Button
              onClick={() => handleResearch()}
              disabled={isLoading || !companyName.trim() || !domain.trim()}
              className="font-mono"
            >
              {isLoading && !researchingId ? 'RESEARCHING...' : 'RESEARCH'}
            </Button>
          </div>
          {error && <p className="text-destructive text-sm mt-2">{error}</p>}
        </CardContent>
      </Card>

      {/* Discovered Companies - Quick Research */}
      {discoveredCompanies.length > 0 && (
        <Card className="rounded-sm border-border">
          <CardHeader className="px-5 py-3 border-b border-border flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="font-normal text-muted-foreground text-xs font-mono uppercase tracking-wide">
                Discovered Companies ({discoveredCompanies.length})
              </CardTitle>
              {isResearchingAll && (
                <span className="text-xs font-mono text-primary">
                  Researching {researchAllProgress.current}/{researchAllProgress.total}...
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleResearchAll}
                disabled={isLoading || isResearchingAll}
                className="font-mono text-xs"
              >
                {isResearchingAll ? `RESEARCHING ${researchAllProgress.current}/${researchAllProgress.total}` : 'RESEARCH ALL'}
              </Button>
              <Button variant="outline" size="sm" onClick={loadDiscoveredCompanies} disabled={isResearchingAll} className="font-mono text-xs">
                REFRESH
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs">Name</TableHead>
                  <TableHead className="font-mono text-xs">Domain</TableHead>
                  <TableHead className="font-mono text-xs">Industry</TableHead>
                  <TableHead className="font-mono text-xs">Status</TableHead>
                  <TableHead className="font-mono text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discoveredCompanies.slice(0, 20).map((company, idx) => (
                  <TableRow key={`${company.domain}-${idx}`}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell className="font-mono text-sm">{company.domain}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {company.industry || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isResearched(company.domain) ? (
                        <Badge variant="default" className="font-mono text-xs">RESEARCHED</Badge>
                      ) : (
                        <Badge variant="secondary" className="font-mono text-xs">PENDING</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={isResearched(company.domain) ? 'outline' : 'default'}
                        onClick={() => handleResearch(company.name, company.domain)}
                        disabled={isLoading}
                        className="font-mono text-xs"
                      >
                        {researchingId === company.domain ? 'RESEARCHING...' : isResearched(company.domain) ? 'RE-RESEARCH' : 'RESEARCH'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {selectedCompany && (
        <Card className="rounded-sm border-border border-primary/50">
          <CardHeader className="px-5 py-3 border-b border-border">
            <CardTitle className="font-normal text-foreground text-sm font-mono">
              {selectedCompany.name} ({selectedCompany.domain})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-mono text-muted-foreground uppercase mb-2">
                  Emails Found ({selectedCompany.emails.length})
                </h4>
                {selectedCompany.emails.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No emails found</p>
                ) : (
                  <ul className="space-y-2">
                    {selectedCompany.emails.map((email, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="font-mono text-sm">{email.email}</span>
                        <Badge variant="outline" className="text-xs">{email.confidence}</Badge>
                        <span className="text-xs text-muted-foreground">{email.purpose}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selectedCompany.contact_pages.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono text-muted-foreground uppercase mb-2">
                    Contact Pages
                  </h4>
                  <ul className="space-y-1">
                    {selectedCompany.contact_pages.map((page, idx) => (
                      <li key={idx} className="text-sm">
                        <a href={page.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {page.url}
                        </a>
                        <span className="text-muted-foreground ml-2">({page.page_type})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-sm border-border">
        <CardHeader className="px-5 py-3 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="font-normal text-muted-foreground text-xs font-mono uppercase tracking-wide">
            Research History ({researchedCompanies.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadResearchedCompanies} className="font-mono text-xs">
            REFRESH
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-xs">Name</TableHead>
                <TableHead className="font-mono text-xs">Domain</TableHead>
                <TableHead className="font-mono text-xs">Status</TableHead>
                <TableHead className="font-mono text-xs">Emails</TableHead>
                <TableHead className="font-mono text-xs">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {researchedCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No companies researched yet.
                  </TableCell>
                </TableRow>
              ) : (
                researchedCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell className="font-mono text-sm">{company.domain}</TableCell>
                    <TableCell>
                      <Badge variant={company.status === 'completed' ? 'default' : 'secondary'} className="font-mono text-xs">
                        {company.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{company.email_count}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {company.updated_at ? new Date(company.updated_at).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Scraper Tab ====================

function ScraperTab() {
  const [domain, setDomain] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [history, setHistory] = useState<ScrapeHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await getScrapeHistory();
      setHistory(data);
    } catch (e) {
      // Ignore
    }
  };

  const handleScrape = async () => {
    if (!domain.trim() || !companyName.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const scrapeResult = await scrapeWebsite(domain, companyName);
      setResult(scrapeResult);
      loadHistory();
      setDomain('');
      setCompanyName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scraping failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-sm border-border">
        <CardHeader className="px-5 py-3 border-b border-border">
          <CardTitle className="font-normal text-muted-foreground text-xs font-mono uppercase tracking-wide">
            Scrape Website for Emails
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-mono text-muted-foreground block mb-1">Domain</label>
              <Input
                placeholder="e.g., stripe.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-mono text-muted-foreground block mb-1">Company Name</label>
              <Input
                placeholder="e.g., Stripe"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="font-mono"
              />
            </div>
            <Button
              onClick={handleScrape}
              disabled={isLoading || !domain.trim() || !companyName.trim()}
              className="font-mono"
            >
              {isLoading ? 'SCRAPING...' : 'SCRAPE'}
            </Button>
          </div>
          {error && <p className="text-destructive text-sm mt-2">{error}</p>}
          {isLoading && (
            <p className="text-muted-foreground text-sm mt-2">
              Scraping in progress... This may take a minute.
            </p>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card className="rounded-sm border-border border-primary/50">
          <CardHeader className="px-5 py-3 border-b border-border">
            <CardTitle className="font-normal text-foreground text-sm font-mono">
              Scrape Results: {result.company_name} ({result.domain})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex gap-4 mb-4">
              <div>
                <span className="text-2xl font-light text-foreground font-display">{result.emails_found}</span>
                <p className="text-xs text-muted-foreground font-mono">Emails Found</p>
              </div>
              <div>
                <span className="text-2xl font-light text-foreground font-display">{result.pages_visited}</span>
                <p className="text-xs text-muted-foreground font-mono">Pages Visited</p>
              </div>
            </div>
            {result.emails.length > 0 && (
              <div>
                <h4 className="text-xs font-mono text-muted-foreground uppercase mb-2">Emails</h4>
                <ul className="space-y-1">
                  {result.emails.map((email, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="font-mono text-sm">{email.email}</span>
                      <a href={email.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                        source
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-sm border-border">
        <CardHeader className="px-5 py-3 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="font-normal text-muted-foreground text-xs font-mono uppercase tracking-wide">
            Scrape History ({history.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadHistory} className="font-mono text-xs">
            REFRESH
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-xs">Domain</TableHead>
                <TableHead className="font-mono text-xs">Company</TableHead>
                <TableHead className="font-mono text-xs">Status</TableHead>
                <TableHead className="font-mono text-xs">Emails</TableHead>
                <TableHead className="font-mono text-xs">Pages</TableHead>
                <TableHead className="font-mono text-xs">Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No scrape history yet.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.domain}</TableCell>
                    <TableCell className="font-medium">{item.company_name}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={item.status === 'completed' ? 'default' : item.status === 'failed' ? 'destructive' : 'secondary'} 
                        className="font-mono text-xs"
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{item.emails_found}</TableCell>
                    <TableCell className="font-mono">{item.pages_visited}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(item.started_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Main Agents View ====================

const Agents: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AgentTab>('discovery');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    checkBackendHealth();
  }, []);

  const checkBackendHealth = async () => {
    try {
      const status = await checkHealth();
      setHealth(status);
      setBackendError(null);
    } catch (e) {
      setBackendError('Backend not connected. Start the API server to use agents.');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0">
      <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
        <h2 className="text-lg font-bold text-foreground font-display tracking-tight">
          Agents
        </h2>
        <div className="flex items-center gap-3">
          {health ? (
            <Badge variant={health.api_key_configured ? 'default' : 'secondary'} className="font-mono text-xs">
              {health.api_key_configured ? 'API KEY OK' : 'NO API KEY'}
            </Badge>
          ) : backendError ? (
            <Badge variant="destructive" className="font-mono text-xs">OFFLINE</Badge>
          ) : null}
          <Button variant="outline" size="sm" onClick={checkBackendHealth} className="font-mono text-xs">
            CHECK STATUS
          </Button>
        </div>
      </header>

      {backendError && (
        <div className="px-6 py-3 bg-destructive/10 border-b border-destructive/20">
          <p className="text-destructive text-sm font-mono">{backendError}</p>
          <p className="text-muted-foreground text-xs mt-1">
            Run: <code className="bg-muted px-1 rounded">cd agents/email_research && PPLX_API_KEY=your_key uvicorn api:app --reload --port 8000</code>
          </p>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 rounded-sm font-mono text-sm transition-colors',
                activeTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              )}
            >
              {AGENT_TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Tab description */}
        <p className="text-muted-foreground text-sm mb-6">
          {AGENT_TAB_DESCRIPTIONS[activeTab]}
        </p>

        {/* Tab content */}
        {activeTab === 'discovery' && <DiscoveryTab />}
        {activeTab === 'research' && <ResearchTab />}
        {activeTab === 'scraper' && <ScraperTab />}
      </div>
    </div>
  );
};

export default Agents;
