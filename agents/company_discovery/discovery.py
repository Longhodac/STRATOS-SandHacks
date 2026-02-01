"""
Company discovery using Perplexity AI.
Discovers companies by industry keyword and resolves official domains.
Outputs to CSV file with deduplication.
"""

import os
import re
import json
import csv
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from pathlib import Path

from langchain_perplexity import ChatPerplexity

from database import (
    Company, Run,
    create_run, update_run, save_company,
    get_setting
)

# CSV output file
CSV_OUTPUT = Path(__file__).parent / "discovered_companies.csv"


def set_api_key(api_key: str) -> None:
    """Set the Perplexity API key."""
    os.environ["PPLX_API_KEY"] = api_key


def discover_companies(
    keyword: str,
    region: str = "",
    max_companies: int = 25,
    api_key: Optional[str] = None
) -> List[Dict]:
    """
    Discover companies by industry keyword using Perplexity.

    Args:
        keyword: Industry keyword (e.g., "robotics", "semiconductors")
        region: Optional region filter (e.g., "California", "Germany")
        max_companies: Maximum number of companies to find
        api_key: Perplexity API key

    Returns:
        List of company dicts with name, domain, description
    """
    if api_key:
        set_api_key(api_key)

    llm = ChatPerplexity(model="sonar-pro")

    # Build search query
    region_part = f" in {region}" if region else ""
    prompt = f"""Find {max_companies} notable {keyword} companies{region_part}.

For each company, provide:
1. Company name
2. Official website domain (just the domain, e.g., "stripe.com")
3. Brief one-sentence description

Output as JSON array with this exact format:
[
  {{"name": "Company Name", "domain": "example.com", "description": "Brief description"}}
]

Requirements:
- Only include established companies with official websites
- Domain must be the company's main official domain
- Do not include LinkedIn, Crunchbase, or directory pages
- Return ONLY the JSON array, no other text"""

    try:
        response = llm.invoke(prompt)
        content = response.content

        # Extract JSON from response
        companies = extract_json_array(content)

        if not companies:
            return []

        # Deduplicate by domain
        seen_domains = set()
        unique_companies = []
        for company in companies:
            domain = company.get("domain", "").lower().strip()
            domain = clean_domain(domain)

            if domain and domain not in seen_domains:
                seen_domains.add(domain)
                company["domain"] = domain
                unique_companies.append(company)

        return unique_companies[:max_companies]

    except Exception as e:
        raise Exception(f"Discovery failed: {str(e)}")


def extract_json_array(text: str) -> List[Dict]:
    """Extract JSON array from text response."""
    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find JSON array in text
    match = re.search(r'\[[\s\S]*\]', text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # Try line by line
    lines = []
    in_array = False
    for line in text.split('\n'):
        if '[' in line:
            in_array = True
        if in_array:
            lines.append(line)
        if ']' in line and in_array:
            break

    if lines:
        try:
            return json.loads('\n'.join(lines))
        except json.JSONDecodeError:
            pass

    return []


def clean_domain(domain: str) -> str:
    """Clean and normalize a domain."""
    domain = domain.lower().strip()

    # Remove protocol
    domain = re.sub(r'^https?://', '', domain)

    # Remove www
    domain = re.sub(r'^www\.', '', domain)

    # Remove path
    domain = domain.split('/')[0]

    # Remove port
    domain = domain.split(':')[0]

    return domain


def get_existing_domains(csv_path: Path = CSV_OUTPUT) -> set:
    """Read existing domains from CSV to check for duplicates."""
    existing = set()
    if csv_path.exists():
        with open(csv_path, 'r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                existing.add(row.get('domain', '').lower())
    return existing


def append_to_csv(company: Dict, csv_path: Path = CSV_OUTPUT) -> bool:
    """
    Append a company to CSV file, avoiding duplicates.
    Creates file with headers if it doesn't exist.
    Returns True if added, False if duplicate.
    """
    # Check if file exists
    file_exists = csv_path.exists()

    # Read existing domains to check for duplicates
    existing_domains = get_existing_domains(csv_path)

    # Check for duplicate
    domain = company.get('domain', '').lower()
    if domain in existing_domains:
        return False  # Duplicate, not added

    # Append to CSV
    fieldnames = ['name', 'domain', 'description', 'industry', 'region', 'discovered_at']

    with open(csv_path, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)

        if not file_exists:
            writer.writeheader()

        writer.writerow({
            'name': company.get('name', ''),
            'domain': domain,
            'description': company.get('description', ''),
            'industry': company.get('industry', ''),
            'region': company.get('region', ''),
            'discovered_at': datetime.now().isoformat()
        })

    return True  # Added successfully


def run_discovery(
    keyword: str,
    region: str = "",
    max_companies: int = 25,
    api_key: Optional[str] = None,
    progress_callback=None
) -> Tuple[int, List[Dict], int, int]:
    """
    Run company discovery pipeline.

    Args:
        keyword: Industry keyword
        region: Optional region filter
        max_companies: Max companies to discover
        api_key: Perplexity API key
        progress_callback: Optional callback(stage, current, total, message)

    Returns:
        Tuple of (run_id, companies_list, added_count, skipped_count)
    """
    if api_key:
        set_api_key(api_key)

    # Create run record
    run_id = create_run(keyword, region, max_companies, "strict")

    def report_progress(stage: str, current: int, total: int, message: str):
        if progress_callback:
            progress_callback(stage, current, total, message)

    try:
        # Discover companies
        report_progress("discovery", 0, 1, f"Searching for {keyword} companies...")

        companies_data = discover_companies(
            keyword=keyword,
            region=region,
            max_companies=max_companies,
            api_key=api_key
        )

        report_progress("discovery", 1, 1, f"Found {len(companies_data)} companies")

        if not companies_data:
            update_run(run_id, "completed", 0, 0)
            return run_id, [], 0, 0

        # Add to CSV with deduplication
        added_count = 0
        skipped_count = 0

        for i, company_data in enumerate(companies_data):
            report_progress("saving", i + 1, len(companies_data), f"Processing {company_data.get('name', 'Unknown')}...")

            # Add industry and region
            company_data['industry'] = keyword
            company_data['region'] = region

            # Try to add to CSV
            if append_to_csv(company_data):
                added_count += 1

                # Also save to database
                company = Company(
                    name=company_data.get('name', ''),
                    domain=company_data.get('domain', ''),
                    industry=keyword,
                    region=region,
                    description=company_data.get('description', ''),
                    status="completed",
                    run_id=run_id
                )
                save_company(company)
            else:
                skipped_count += 1

        # Update run
        update_run(run_id, "completed", added_count, 0)
        report_progress("complete", len(companies_data), len(companies_data), "Discovery complete!")

        return run_id, companies_data, added_count, skipped_count

    except Exception as e:
        update_run(run_id, "failed", error_message=str(e))
        raise


def get_csv_companies() -> List[Dict]:
    """Read all companies from CSV."""
    if not CSV_OUTPUT.exists():
        return []

    with open(CSV_OUTPUT, 'r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)


def get_company_count() -> int:
    """Get count of companies in CSV."""
    return len(get_csv_companies())
