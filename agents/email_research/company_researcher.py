"""
Company contact researcher using Perplexity AI.
Searches for public company emails with source URLs.
"""

import os
import json
import re
from typing import Optional, Dict, Any
from datetime import datetime

from langchain_perplexity import ChatPerplexity
from models import Company, Email, ContactPage, save_company, get_company, log_search_run


# Research prompt template
RESEARCH_PROMPT = """For {company_name} (and domain {domain}), find only publicly posted contact email addresses from official sources (company website pages like Contact, Press/Media, Security/Trust, Legal/Privacy, Support/Help).

Do not guess email formats, do not use personal/employee emails, and do not use scraped LinkedIn data.

Output strict JSON with this schema:

{{
  "company": "",
  "domain": "",
  "emails": [
    {{"email":"","purpose":"","confidence":"high|medium|low","source_url":"","evidence_quote":""}}
  ],
  "contact_pages": [{{"url":"","type":"contact|press|security|legal|support"}}],
  "notes": ["short bullets about what channels exist and what is missing"]
}}

Requirements: each email must include the exact source URL and a short evidence quote from the page. If you can't find an email for a category, include the best official contact page URL instead.

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks, just the raw JSON object."""


def set_api_key(api_key: str) -> None:
    """Set the Perplexity API key in environment."""
    os.environ["PPLX_API_KEY"] = api_key


def extract_json_from_response(text: str) -> Optional[Dict]:
    """Extract JSON from response, handling markdown code blocks."""
    # Try direct JSON parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to extract from markdown code block
    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try to find JSON object in text
    json_match = re.search(r'\{[^{}]*"company"[^{}]*\}', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            pass

    # Try more aggressive extraction
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1:
        try:
            return json.loads(text[start:end+1])
        except json.JSONDecodeError:
            pass

    return None


def research_company(
    company_name: str,
    domain: str,
    api_key: Optional[str] = None,
    force_refresh: bool = False
) -> Company:
    """
    Research a company's public contact information using Perplexity.

    Args:
        company_name: The company name to research
        domain: The company's domain (e.g., stripe.com)
        api_key: Perplexity API key (optional if already set in env)
        force_refresh: If True, bypass cache and research again

    Returns:
        Company object with emails and contact pages
    """
    if api_key:
        set_api_key(api_key)

    # Check cache unless force refresh
    if not force_refresh:
        cached = get_company(domain)
        if cached and cached.status == "completed":
            return cached

    # Create initial company record
    company = Company(
        name=company_name,
        domain=domain,
        status="processing"
    )
    company_id = save_company(company)
    log_search_run(company_id, "running")

    try:
        # Call Perplexity API
        llm = ChatPerplexity(model="sonar-pro")
        prompt = RESEARCH_PROMPT.format(
            company_name=company_name,
            domain=domain
        )

        response = llm.invoke(prompt)
        raw_response = response.content

        # Parse JSON response
        data = extract_json_from_response(raw_response)

        if not data:
            # If JSON parsing fails, still save raw response
            company.status = "failed"
            company.raw_response = raw_response
            company.notes = ["Failed to parse JSON response from Perplexity"]
            save_company(company)
            log_search_run(company_id, "failed", "JSON parsing failed")
            return company

        # Extract emails
        for email_data in data.get("emails", []):
            if email_data.get("email"):
                company.emails.append(Email(
                    email=email_data.get("email", ""),
                    purpose=email_data.get("purpose", ""),
                    confidence=email_data.get("confidence", "low"),
                    source_url=email_data.get("source_url", ""),
                    evidence_quote=email_data.get("evidence_quote", "")
                ))

        # Extract contact pages
        for page_data in data.get("contact_pages", []):
            if page_data.get("url"):
                company.contact_pages.append(ContactPage(
                    url=page_data.get("url", ""),
                    page_type=page_data.get("type", "contact")
                ))

        # Extract notes
        company.notes = data.get("notes", [])
        company.raw_response = raw_response
        company.status = "completed"

        # Save to database
        save_company(company)
        log_search_run(company_id, "completed")

        return company

    except Exception as e:
        company.status = "failed"
        company.notes = [f"Error: {str(e)}"]
        save_company(company)
        log_search_run(company_id, "failed", str(e))
        raise


def dedupe_and_score(company: Company) -> Company:
    """
    Deduplicate emails and re-score based on evidence quality.

    Args:
        company: Company object with emails

    Returns:
        Company with deduplicated and scored emails
    """
    seen_emails = {}

    for email in company.emails:
        email_lower = email.email.lower()

        if email_lower not in seen_emails:
            seen_emails[email_lower] = email
        else:
            # Keep the one with higher confidence or more evidence
            existing = seen_emails[email_lower]
            confidence_order = {"high": 3, "medium": 2, "low": 1}

            existing_score = confidence_order.get(existing.confidence, 0)
            new_score = confidence_order.get(email.confidence, 0)

            # Boost score if there's a source URL and evidence
            if email.source_url:
                new_score += 1
            if email.evidence_quote:
                new_score += 1
            if existing.source_url:
                existing_score += 1
            if existing.evidence_quote:
                existing_score += 1

            if new_score > existing_score:
                seen_emails[email_lower] = email

    company.emails = list(seen_emails.values())
    return company


def get_company_summary(company: Company) -> Dict[str, Any]:
    """
    Get a summary of company research results.

    Args:
        company: Company object

    Returns:
        Dictionary with summary statistics
    """
    return {
        "company": company.name,
        "domain": company.domain,
        "status": company.status,
        "email_count": len(company.emails),
        "high_confidence_emails": len([e for e in company.emails if e.confidence == "high"]),
        "medium_confidence_emails": len([e for e in company.emails if e.confidence == "medium"]),
        "low_confidence_emails": len([e for e in company.emails if e.confidence == "low"]),
        "contact_page_count": len(company.contact_pages),
        "notes": company.notes,
        "updated_at": company.updated_at
    }
