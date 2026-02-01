"""
FastAPI backend for company contact research.
Provides REST API endpoints for programmatic access.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import os

import company_researcher
from models import list_companies, get_company, get_company_by_id, Company as DBCompany

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
        api_key_configured=bool(os.environ.get("PPLX_API_KEY"))
    )


@app.post("/research", response_model=CompanyResponse)
async def research_company(request: ResearchRequest):
    """
    Research a company's public contact information.

    Returns emails found from official company pages with source URLs.
    """
    api_key = os.environ.get("PPLX_API_KEY")
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
    api_key = os.environ.get("PPLX_API_KEY")
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
