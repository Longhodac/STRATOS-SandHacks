/**
 * API client for the Python agents backend.
 * Uses VITE_API_URL when set (e.g. for production); falls back to localhost for dev.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// ==================== Types ====================

export interface DiscoveredCompany {
  name: string;
  domain: string;
  description: string;
  industry: string;
  region: string;
  discovered_at?: string;
}

export interface DiscoveryRun {
  id: number;
  keyword: string;
  region: string;
  max_companies: number;
  status: string;
  companies_found: number;
  emails_found: number;
  started_at?: string;
  completed_at?: string;
}

export interface DiscoveryResult {
  run_id: number;
  companies: DiscoveredCompany[];
  added_count: number;
  skipped_count: number;
}

export interface ResearchedEmail {
  email: string;
  purpose: string;
  confidence: string;
  source_url: string;
  evidence_quote: string;
}

export interface ContactPage {
  url: string;
  page_type: string;
}

export interface ResearchedCompany {
  id?: number;
  name: string;
  domain: string;
  status: string;
  emails: ResearchedEmail[];
  contact_pages: ContactPage[];
  notes: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ResearchedCompanyListItem {
  id: number;
  name: string;
  domain: string;
  status: string;
  email_count: number;
  updated_at?: string;
}

export interface ScrapedEmail {
  email: string;
  source_url: string;
  scraped_at: string;
}

export interface ScrapeResult {
  domain: string;
  company_name: string;
  emails_found: number;
  pages_visited: number;
  emails: ScrapedEmail[];
}

export interface ScrapeHistoryItem {
  id: number;
  domain: string;
  company_name: string;
  status: string;
  emails_found: number;
  pages_visited: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export interface HealthStatus {
  status: string;
  api_key_configured: boolean;
}

// ==================== API Helper ====================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ==================== Health Check ====================

export async function checkHealth(): Promise<HealthStatus> {
  return apiRequest<HealthStatus>('/health');
}

// ==================== Company Discovery ====================

export async function discoverCompanies(
  keyword: string,
  region?: string,
  maxCompanies: number = 25
): Promise<DiscoveryResult> {
  return apiRequest<DiscoveryResult>('/discovery/search', {
    method: 'POST',
    body: JSON.stringify({
      keyword,
      region: region || '',
      max_companies: maxCompanies,
    }),
  });
}

export async function getDiscoveredCompanies(): Promise<DiscoveredCompany[]> {
  return apiRequest<DiscoveredCompany[]>('/discovery/companies');
}

export async function deleteDiscoveredCompany(domain: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/discovery/companies/${encodeURIComponent(domain)}`, {
    method: 'DELETE',
  });
}

export async function getDiscoveryRuns(limit: number = 50): Promise<DiscoveryRun[]> {
  return apiRequest<DiscoveryRun[]>(`/discovery/runs?limit=${limit}`);
}

export async function getRunCompanies(runId: number): Promise<DiscoveredCompany[]> {
  return apiRequest<DiscoveredCompany[]>(`/discovery/runs/${runId}/companies`);
}

// ==================== Email Research ====================

export async function researchCompany(
  companyName: string,
  domain: string,
  forceRefresh: boolean = false
): Promise<ResearchedCompany> {
  return apiRequest<ResearchedCompany>('/research', {
    method: 'POST',
    body: JSON.stringify({
      company_name: companyName,
      domain,
      force_refresh: forceRefresh,
    }),
  });
}

export async function getResearchedCompanies(
  limit: number = 50,
  offset: number = 0
): Promise<ResearchedCompanyListItem[]> {
  return apiRequest<ResearchedCompanyListItem[]>(
    `/companies?limit=${limit}&offset=${offset}`
  );
}

export async function getResearchedCompanyById(
  companyId: number
): Promise<ResearchedCompany> {
  return apiRequest<ResearchedCompany>(`/companies/${companyId}`);
}

export async function getResearchedCompanyByDomain(
  domain: string
): Promise<ResearchedCompany> {
  return apiRequest<ResearchedCompany>(`/companies/domain/${domain}`);
}

// ==================== Selenium Scraper ====================

export async function scrapeWebsite(
  domain: string,
  companyName: string,
  headless: boolean = true,
  maxPages: number = 10
): Promise<ScrapeResult> {
  return apiRequest<ScrapeResult>('/scraper/scrape', {
    method: 'POST',
    body: JSON.stringify({
      domain,
      company_name: companyName,
      headless,
      max_pages: maxPages,
    }),
  });
}

export async function getScrapedEmails(domain: string): Promise<ScrapedEmail[]> {
  return apiRequest<ScrapedEmail[]>(`/scraper/emails/${domain}`);
}

export async function getAllScrapedEmails(): Promise<ScrapedEmail[]> {
  return apiRequest<ScrapedEmail[]>('/scraper/emails');
}

export async function getScrapeHistory(limit: number = 50): Promise<ScrapeHistoryItem[]> {
  return apiRequest<ScrapeHistoryItem[]>(`/scraper/history?limit=${limit}`);
}
