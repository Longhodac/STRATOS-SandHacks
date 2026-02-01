"""
FastAPI backend for company contact research.
Provides REST API endpoints for programmatic access.
Includes: Email Research, Company Discovery, and Selenium Scraper.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import sys
from pathlib import Path

# Add paths to other agent modules
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
sys.path.insert(0, str(SCRIPT_DIR.parent / "company_discovery"))

# Try to load API key from secrets.toml if not in environment
def load_api_key():
    """Load Perplexity API key from env var or secrets.toml."""
    key = os.environ.get("PPLX_API_KEY")
    if key:
        return key
    
    # Try to load from secrets.toml
    secrets_path = SCRIPT_DIR.parent / ".streamlit" / "secrets.toml"
    if secrets_path.exists():
        try:
            import tomllib
        except ImportError:
            import tomli as tomllib
        
        try:
            with open(secrets_path, "rb") as f:
                secrets = tomllib.load(f)
                key = secrets.get("PPLX_API_KEY", "")
                if key:
                    os.environ["PPLX_API_KEY"] = key
                    return key
        except Exception:
            pass
    
    return ""

# Load API key on startup
PPLX_API_KEY = load_api_key()

# Email research imports
import company_researcher
from models import list_companies, get_company, get_company_by_id, Company as DBCompany

# Company discovery imports
from discovery import discover_companies as discovery_search, get_csv_companies, run_discovery
from database import list_runs as discovery_list_runs, get_companies_for_run, get_run

# Selenium scraper imports (functions from selenium_scraper_app.py)
from selenium_scraper_app import (
    scrape_website,
    get_emails_for_domain,
    get_all_emails as get_all_scraped_emails,
    get_scrape_history,
    init_db as init_scraper_db
)

# Initialize scraper database
init_scraper_db()

app = FastAPI(
    title="Company Contact Research API",
    description="Find public company contact emails with verified sources",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models
class ResearchRequest(BaseModel):
    company_name: str = Field(..., description="The company name to research")
    domain: str = Field(..., description="The company's main domain")
    force_refresh: bool = Field(False, description="Bypass cache and research again")


class EmailResponse(BaseModel):
    email: str
    purpose: str
    confidence: str
    source_url: str
    evidence_quote: str


class ContactPageResponse(BaseModel):
    url: str
    page_type: str


class CompanyResponse(BaseModel):
    id: Optional[int]
    name: str
    domain: str
    status: str
    emails: List[EmailResponse]
    contact_pages: List[ContactPageResponse]
    notes: List[str]
    created_at: Optional[str]
    updated_at: Optional[str]


class CompanyListItem(BaseModel):
    id: int
    name: str
    domain: str
    status: str
    email_count: int
    updated_at: Optional[str]


class HealthResponse(BaseModel):
    status: str
    api_key_configured: bool


# ========== Company Discovery Models ==========

class DiscoveryRequest(BaseModel):
    keyword: str = Field(..., description="Industry keyword (e.g., 'robotics', 'fintech')")
    region: str = Field("", description="Optional region filter (e.g., 'California', 'Germany')")
    max_companies: int = Field(25, description="Maximum companies to discover")


class DiscoveredCompanyResponse(BaseModel):
    name: str
    domain: str
    description: str
    industry: str
    region: str
    discovered_at: Optional[str] = None


class DiscoveryRunResponse(BaseModel):
    id: int
    keyword: str
    region: str
    max_companies: int
    status: str
    companies_found: int
    emails_found: int
    started_at: Optional[str]
    completed_at: Optional[str]


class DiscoveryResultResponse(BaseModel):
    run_id: int
    companies: List[DiscoveredCompanyResponse]
    added_count: int
    skipped_count: int


# ========== Selenium Scraper Models ==========

class ScrapeRequest(BaseModel):
    domain: str = Field(..., description="Domain to scrape (e.g., 'example.com')")
    company_name: str = Field(..., description="Company name for reference")
    headless: bool = Field(True, description="Run browser in headless mode")
    max_pages: int = Field(10, description="Maximum pages to visit")


class ScrapedEmailResponse(BaseModel):
    email: str
    source_url: str
    scraped_at: str


class ScrapeResultResponse(BaseModel):
    domain: str
    company_name: str
    emails_found: int
    pages_visited: int
    emails: List[ScrapedEmailResponse]


class ScrapeHistoryItem(BaseModel):
    id: int
    domain: str
    company_name: str
    status: str
    emails_found: int
    pages_visited: int
    error_message: Optional[str]
    started_at: str
    completed_at: Optional[str]


def company_to_response(company: DBCompany) -> CompanyResponse:
    """Convert database Company to API response."""
    return CompanyResponse(
        id=company.id,
        name=company.name,
        domain=company.domain,
        status=company.status,
        emails=[
            EmailResponse(
                email=e.email,
                purpose=e.purpose or "",
                confidence=e.confidence or "low",
                source_url=e.source_url or "",
                evidence_quote=e.evidence_quote or ""
            )
            for e in company.emails
        ],
        contact_pages=[
            ContactPageResponse(
                url=p.url,
                page_type=p.page_type or "contact"
            )
            for p in company.contact_pages
        ],
        notes=company.notes or [],
        created_at=company.created_at,
        updated_at=company.updated_at
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check API health and configuration."""
    return HealthResponse(
        status="ok",
        api_key_configured=bool(PPLX_API_KEY)
    )


@app.post("/research", response_model=CompanyResponse)
async def research_company(request: ResearchRequest):
    """
    Research a company's public contact information.

    Returns emails found from official company pages with source URLs.
    """
    api_key = PPLX_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="PPLX_API_KEY not configured. Set it in environment variables."
        )

    try:
        company = company_researcher.research_company(
            company_name=request.company_name,
            domain=request.domain,
            api_key=api_key,
            force_refresh=request.force_refresh
        )
        return company_to_response(company)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/companies", response_model=List[CompanyListItem])
async def get_companies(limit: int = 50, offset: int = 0):
    """List all researched companies with pagination."""
    companies = list_companies(limit=limit, offset=offset)

    return [
        CompanyListItem(
            id=c.id,
            name=c.name,
            domain=c.domain,
            status=c.status,
            email_count=len(c.emails),
            updated_at=c.updated_at
        )
        for c in companies
    ]


@app.get("/companies/{company_id}", response_model=CompanyResponse)
async def get_company_details(company_id: int):
    """Get detailed information for a specific company."""
    company = get_company_by_id(company_id)

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    return company_to_response(company)


@app.get("/companies/domain/{domain}", response_model=CompanyResponse)
async def get_company_by_domain(domain: str):
    """Get company information by domain."""
    company = get_company(domain)

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    return company_to_response(company)


# Background task for async research
async def background_research(company_name: str, domain: str):
    """Run research in background."""
    api_key = PPLX_API_KEY
    if api_key:
        company_researcher.research_company(
            company_name=company_name,
            domain=domain,
            api_key=api_key,
            force_refresh=False
        )


@app.post("/research/async")
async def research_company_async(
    request: ResearchRequest,
    background_tasks: BackgroundTasks
):
    """
    Start research in background and return immediately.

    Check /companies/domain/{domain} for results.
    """
    background_tasks.add_task(
        background_research,
        request.company_name,
        request.domain
    )

    return {
        "status": "started",
        "message": f"Research started for {request.company_name}",
        "check_url": f"/companies/domain/{request.domain}"
    }


# ========== Company Discovery Endpoints ==========

@app.post("/discovery/search", response_model=DiscoveryResultResponse)
async def discovery_search_companies(request: DiscoveryRequest):
    """
    Discover companies by industry keyword using Perplexity AI.
    
    Returns a list of companies with names, domains, and descriptions.
    """
    api_key = PPLX_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="PPLX_API_KEY not configured. Set it in environment variables."
        )
    
    try:
        run_id, companies, added_count, skipped_count = run_discovery(
            keyword=request.keyword,
            region=request.region,
            max_companies=request.max_companies,
            api_key=api_key
        )
        
        return DiscoveryResultResponse(
            run_id=run_id,
            companies=[
                DiscoveredCompanyResponse(
                    name=c.get("name", ""),
                    domain=c.get("domain", ""),
                    description=c.get("description", ""),
                    industry=c.get("industry", request.keyword),
                    region=c.get("region", request.region)
                )
                for c in companies
            ],
            added_count=added_count,
            skipped_count=skipped_count
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/discovery/companies", response_model=List[DiscoveredCompanyResponse])
async def discovery_get_companies():
    """Get all discovered companies from CSV."""
    try:
        companies = get_csv_companies()
        return [
            DiscoveredCompanyResponse(
                name=c.get("name", ""),
                domain=c.get("domain", ""),
                description=c.get("description", ""),
                industry=c.get("industry", ""),
                region=c.get("region", ""),
                discovered_at=c.get("discovered_at")
            )
            for c in companies
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/discovery/runs", response_model=List[DiscoveryRunResponse])
async def discovery_get_runs(limit: int = 50):
    """Get discovery run history."""
    try:
        runs = discovery_list_runs(limit=limit)
        return [
            DiscoveryRunResponse(
                id=r.id,
                keyword=r.keyword,
                region=r.region,
                max_companies=r.max_companies,
                status=r.status,
                companies_found=r.companies_found,
                emails_found=r.emails_found,
                started_at=r.started_at,
                completed_at=r.completed_at
            )
            for r in runs
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/discovery/runs/{run_id}/companies", response_model=List[DiscoveredCompanyResponse])
async def discovery_get_run_companies(run_id: int):
    """Get companies for a specific discovery run."""
    try:
        companies = get_companies_for_run(run_id)
        if not companies:
            raise HTTPException(status_code=404, detail="Run not found or has no companies")
        
        return [
            DiscoveredCompanyResponse(
                name=c.name,
                domain=c.domain,
                description=c.description,
                industry=c.industry,
                region=c.region,
                discovered_at=c.created_at
            )
            for c in companies
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== Selenium Scraper Endpoints ==========

@app.post("/scraper/scrape", response_model=ScrapeResultResponse)
async def scraper_scrape_website(request: ScrapeRequest):
    """
    Scrape a website for email addresses using Selenium.
    
    Visits the domain and its contact/about pages to find email addresses.
    """
    try:
        result = scrape_website(
            domain=request.domain,
            company_name=request.company_name,
            headless=request.headless,
            max_pages=request.max_pages
        )
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=500, 
                detail=result.get("error", "Scraping failed")
            )
        
        # Get saved emails for this domain
        saved_emails = get_emails_for_domain(request.domain)
        
        return ScrapeResultResponse(
            domain=request.domain,
            company_name=request.company_name,
            emails_found=len(result.get("emails", [])),
            pages_visited=result.get("pages_visited", 0),
            emails=[
                ScrapedEmailResponse(
                    email=e["email"],
                    source_url=e["source_url"],
                    scraped_at=e["scraped_at"]
                )
                for e in saved_emails
            ]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/scraper/emails/{domain}", response_model=List[ScrapedEmailResponse])
async def scraper_get_emails(domain: str):
    """Get all scraped emails for a domain."""
    try:
        emails = get_emails_for_domain(domain)
        return [
            ScrapedEmailResponse(
                email=e["email"],
                source_url=e["source_url"],
                scraped_at=e["scraped_at"]
            )
            for e in emails
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/scraper/emails", response_model=List[dict])
async def scraper_get_all_emails():
    """Get all scraped emails."""
    try:
        return get_all_scraped_emails()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/scraper/history", response_model=List[ScrapeHistoryItem])
async def scraper_get_history(limit: int = 50):
    """Get scrape run history."""
    try:
        history = get_scrape_history(limit=limit)
        return [
            ScrapeHistoryItem(
                id=h["id"],
                domain=h["domain"],
                company_name=h["company_name"],
                status=h["status"],
                emails_found=h["emails_found"] or 0,
                pages_visited=h["pages_visited"] or 0,
                error_message=h["error_message"],
                started_at=h["started_at"],
                completed_at=h["completed_at"]
            )
            for h in history
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
