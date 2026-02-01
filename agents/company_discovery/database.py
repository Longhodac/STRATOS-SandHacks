"""
Database models and operations for company discovery.
SQLite with tables: companies, sources, emails, runs.
"""

import sqlite3
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from pathlib import Path

DB_PATH = Path(__file__).parent / "company_discovery.db"


@dataclass
class Email:
    email: str
    category: str  # sales, support, press, security, privacy, careers, other
    source_url: str
    evidence_snippet: str
    confidence: str = "medium"
    id: Optional[int] = None
    company_id: Optional[int] = None
    created_at: Optional[str] = None


@dataclass
class Source:
    url: str
    path_type: str  # contact, about, press, security, privacy, support
    status: str  # fetched, blocked, error
    fetched_at: Optional[str] = None
    id: Optional[int] = None
    company_id: Optional[int] = None


@dataclass
class Company:
    name: str
    domain: str
    industry: str
    region: str = ""
    description: str = ""
    status: str = "pending"  # pending, processing, completed, failed
    id: Optional[int] = None
    run_id: Optional[int] = None
    created_at: Optional[str] = None
    emails: List[Email] = field(default_factory=list)
    sources: List[Source] = field(default_factory=list)


@dataclass
class Run:
    keyword: str
    region: str
    max_companies: int
    strictness: str  # strict, moderate
    status: str = "pending"  # pending, running, completed, failed
    companies_found: int = 0
    emails_found: int = 0
    id: Optional[int] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error_message: Optional[str] = None


def init_db():
    """Initialize database with all required tables."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Runs table (audit trail)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            keyword TEXT NOT NULL,
            region TEXT,
            max_companies INTEGER,
            strictness TEXT DEFAULT 'strict',
            status TEXT DEFAULT 'pending',
            companies_found INTEGER DEFAULT 0,
            emails_found INTEGER DEFAULT 0,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            error_message TEXT
        )
    """)

    # Companies table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER,
            name TEXT NOT NULL,
            domain TEXT NOT NULL,
            industry TEXT,
            region TEXT,
            description TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (run_id) REFERENCES runs(id),
            UNIQUE(run_id, domain)
        )
    """)

    # Sources table (URLs fetched)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            url TEXT NOT NULL,
            path_type TEXT,
            status TEXT DEFAULT 'pending',
            fetched_at TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies(id),
            UNIQUE(company_id, url)
        )
    """)

    # Emails table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            email TEXT NOT NULL,
            category TEXT,
            source_url TEXT,
            evidence_snippet TEXT,
            confidence TEXT DEFAULT 'medium',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies(id),
            UNIQUE(company_id, email)
        )
    """)

    # Settings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)

    # Insert default settings
    default_settings = {
        "rate_limit_seconds": "2",
        "max_pages_per_domain": "10",
        "strictness": "strict",
        "user_agent": "CompanyDiscoveryBot/1.0 (contact: admin@example.com)"
    }

    for key, value in default_settings.items():
        cursor.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
            (key, value)
        )

    conn.commit()
    conn.close()


def get_setting(key: str) -> Optional[str]:
    """Get a setting value."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None


def set_setting(key: str, value: str):
    """Set a setting value."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        (key, value)
    )
    conn.commit()
    conn.close()


def create_run(keyword: str, region: str, max_companies: int, strictness: str) -> int:
    """Create a new run and return its ID."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO runs (keyword, region, max_companies, strictness, status, started_at)
        VALUES (?, ?, ?, ?, 'running', CURRENT_TIMESTAMP)
    """, (keyword, region, max_companies, strictness))
    run_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return run_id


def update_run(run_id: int, status: str, companies_found: int = 0, emails_found: int = 0, error_message: str = None):
    """Update run status and stats."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE runs
        SET status = ?, companies_found = ?, emails_found = ?,
            completed_at = CASE WHEN ? IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE completed_at END,
            error_message = ?
        WHERE id = ?
    """, (status, companies_found, emails_found, status, error_message, run_id))
    conn.commit()
    conn.close()


def save_company(company: Company) -> int:
    """Save a company and return its ID."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT OR REPLACE INTO companies (run_id, name, domain, industry, region, description, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (company.run_id, company.name, company.domain, company.industry, company.region, company.description, company.status))

    company_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return company_id


def save_source(source: Source, company_id: int):
    """Save a source URL."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR IGNORE INTO sources (company_id, url, path_type, status, fetched_at)
        VALUES (?, ?, ?, ?, ?)
    """, (company_id, source.url, source.path_type, source.status, source.fetched_at))
    conn.commit()
    conn.close()


def save_email(email: Email, company_id: int) -> bool:
    """Save an email. Returns True if inserted (not duplicate)."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO emails (company_id, email, category, source_url, evidence_snippet, confidence)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (company_id, email.email.lower(), email.category, email.source_url, email.evidence_snippet, email.confidence))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False  # Duplicate
    finally:
        conn.close()


def get_run(run_id: int) -> Optional[Run]:
    """Get a run by ID."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM runs WHERE id = ?", (run_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return Run(
        id=row["id"],
        keyword=row["keyword"],
        region=row["region"],
        max_companies=row["max_companies"],
        strictness=row["strictness"],
        status=row["status"],
        companies_found=row["companies_found"],
        emails_found=row["emails_found"],
        started_at=row["started_at"],
        completed_at=row["completed_at"],
        error_message=row["error_message"]
    )


def list_runs(limit: int = 50) -> List[Run]:
    """List all runs."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM runs ORDER BY started_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()

    return [
        Run(
            id=row["id"],
            keyword=row["keyword"],
            region=row["region"],
            max_companies=row["max_companies"],
            strictness=row["strictness"],
            status=row["status"],
            companies_found=row["companies_found"],
            emails_found=row["emails_found"],
            started_at=row["started_at"],
            completed_at=row["completed_at"]
        )
        for row in rows
    ]


def get_companies_for_run(run_id: int) -> List[Company]:
    """Get all companies for a run with their emails and sources."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM companies WHERE run_id = ?", (run_id,))
    company_rows = cursor.fetchall()

    companies = []
    for row in company_rows:
        company = Company(
            id=row["id"],
            run_id=row["run_id"],
            name=row["name"],
            domain=row["domain"],
            industry=row["industry"],
            region=row["region"],
            description=row["description"],
            status=row["status"],
            created_at=row["created_at"]
        )

        # Get emails
        cursor.execute("SELECT * FROM emails WHERE company_id = ?", (company.id,))
        for email_row in cursor.fetchall():
            company.emails.append(Email(
                id=email_row["id"],
                company_id=email_row["company_id"],
                email=email_row["email"],
                category=email_row["category"],
                source_url=email_row["source_url"],
                evidence_snippet=email_row["evidence_snippet"],
                confidence=email_row["confidence"],
                created_at=email_row["created_at"]
            ))

        # Get sources
        cursor.execute("SELECT * FROM sources WHERE company_id = ?", (company.id,))
        for source_row in cursor.fetchall():
            company.sources.append(Source(
                id=source_row["id"],
                company_id=source_row["company_id"],
                url=source_row["url"],
                path_type=source_row["path_type"],
                status=source_row["status"],
                fetched_at=source_row["fetched_at"]
            ))

        companies.append(company)

    conn.close()
    return companies


def get_all_emails(run_id: Optional[int] = None) -> List[Dict]:
    """Get all emails, optionally filtered by run."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    if run_id:
        cursor.execute("""
            SELECT e.*, c.name as company_name, c.domain as company_domain
            FROM emails e
            JOIN companies c ON e.company_id = c.id
            WHERE c.run_id = ?
            ORDER BY c.name, e.category
        """, (run_id,))
    else:
        cursor.execute("""
            SELECT e.*, c.name as company_name, c.domain as company_domain
            FROM emails e
            JOIN companies c ON e.company_id = c.id
            ORDER BY c.name, e.category
        """)

    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def delete_company(domain: str) -> bool:
    """Delete a company and all related data by domain. Returns True if deleted."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Find company ID by domain
    cursor.execute("SELECT id FROM companies WHERE domain = ?", (domain,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        return False
    
    company_id = row[0]
    
    # Delete related data first (foreign key constraints)
    cursor.execute("DELETE FROM emails WHERE company_id = ?", (company_id,))
    cursor.execute("DELETE FROM sources WHERE company_id = ?", (company_id,))
    cursor.execute("DELETE FROM companies WHERE id = ?", (company_id,))
    
    conn.commit()
    conn.close()
    return True


# Initialize database on import
init_db()
