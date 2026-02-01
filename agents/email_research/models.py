"""
Data models for company contact research.
SQLite database with SQLAlchemy ORM.
"""

import sqlite3
from datetime import datetime
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field, asdict
import json


# Database path
DB_PATH = "company_contacts.db"


@dataclass
class Email:
    email: str
    purpose: str
    confidence: str  # high, medium, low
    source_url: str
    evidence_quote: str
    id: Optional[int] = None
    company_id: Optional[int] = None
    created_at: Optional[str] = None


@dataclass
class ContactPage:
    url: str
    page_type: str  # contact, press, security, legal, support
    id: Optional[int] = None
    company_id: Optional[int] = None


@dataclass
class Company:
    name: str
    domain: str
    id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    emails: List[Email] = field(default_factory=list)
    contact_pages: List[ContactPage] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)
    raw_response: Optional[str] = None
    status: str = "pending"  # pending, processing, completed, failed


@dataclass
class SearchRun:
    company_id: int
    status: str  # pending, running, completed, failed
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error_message: Optional[str] = None
    id: Optional[int] = None


def init_db():
    """Initialize the database with required tables."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Companies table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            domain TEXT NOT NULL UNIQUE,
            notes TEXT,
            raw_response TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Emails table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            email TEXT NOT NULL,
            purpose TEXT,
            confidence TEXT,
            source_url TEXT,
            evidence_quote TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies(id),
            UNIQUE(company_id, email)
        )
    """)

    # Contact pages table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contact_pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            url TEXT NOT NULL,
            page_type TEXT,
            FOREIGN KEY (company_id) REFERENCES companies(id),
            UNIQUE(company_id, url)
        )
    """)

    # Search runs table (audit log)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS search_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            error_message TEXT,
            FOREIGN KEY (company_id) REFERENCES companies(id)
        )
    """)

    conn.commit()
    conn.close()


def save_company(company: Company) -> int:
    """Save or update a company and its related data."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if company exists
        cursor.execute("SELECT id FROM companies WHERE domain = ?", (company.domain,))
        row = cursor.fetchone()

        if row:
            company_id = row[0]
            # Update existing company
            cursor.execute("""
                UPDATE companies
                SET name = ?, notes = ?, raw_response = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (company.name, json.dumps(company.notes), company.raw_response, company.status, company_id))

            # Clear existing emails and contact pages
            cursor.execute("DELETE FROM emails WHERE company_id = ?", (company_id,))
            cursor.execute("DELETE FROM contact_pages WHERE company_id = ?", (company_id,))
        else:
            # Insert new company
            cursor.execute("""
                INSERT INTO companies (name, domain, notes, raw_response, status)
                VALUES (?, ?, ?, ?, ?)
            """, (company.name, company.domain, json.dumps(company.notes), company.raw_response, company.status))
            company_id = cursor.lastrowid

        # Insert emails
        for email in company.emails:
            cursor.execute("""
                INSERT OR IGNORE INTO emails (company_id, email, purpose, confidence, source_url, evidence_quote)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (company_id, email.email, email.purpose, email.confidence, email.source_url, email.evidence_quote))

        # Insert contact pages
        for page in company.contact_pages:
            cursor.execute("""
                INSERT OR IGNORE INTO contact_pages (company_id, url, page_type)
                VALUES (?, ?, ?)
            """, (company_id, page.url, page.page_type))

        conn.commit()
        return company_id

    finally:
        conn.close()


def get_company(domain: str) -> Optional[Company]:
    """Get a company by domain with all related data."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT * FROM companies WHERE domain = ?", (domain,))
        row = cursor.fetchone()

        if not row:
            return None

        company = Company(
            id=row["id"],
            name=row["name"],
            domain=row["domain"],
            notes=json.loads(row["notes"]) if row["notes"] else [],
            raw_response=row["raw_response"],
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"]
        )

        # Get emails
        cursor.execute("SELECT * FROM emails WHERE company_id = ?", (company.id,))
        for email_row in cursor.fetchall():
            company.emails.append(Email(
                id=email_row["id"],
                company_id=email_row["company_id"],
                email=email_row["email"],
                purpose=email_row["purpose"],
                confidence=email_row["confidence"],
                source_url=email_row["source_url"],
                evidence_quote=email_row["evidence_quote"],
                created_at=email_row["created_at"]
            ))

        # Get contact pages
        cursor.execute("SELECT * FROM contact_pages WHERE company_id = ?", (company.id,))
        for page_row in cursor.fetchall():
            company.contact_pages.append(ContactPage(
                id=page_row["id"],
                company_id=page_row["company_id"],
                url=page_row["url"],
                page_type=page_row["page_type"]
            ))

        return company

    finally:
        conn.close()


def get_company_by_id(company_id: int) -> Optional[Company]:
    """Get a company by ID with all related data."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT * FROM companies WHERE id = ?", (company_id,))
        row = cursor.fetchone()

        if not row:
            return None

        company = Company(
            id=row["id"],
            name=row["name"],
            domain=row["domain"],
            notes=json.loads(row["notes"]) if row["notes"] else [],
            raw_response=row["raw_response"],
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"]
        )

        # Get emails
        cursor.execute("SELECT * FROM emails WHERE company_id = ?", (company.id,))
        for email_row in cursor.fetchall():
            company.emails.append(Email(
                id=email_row["id"],
                company_id=email_row["company_id"],
                email=email_row["email"],
                purpose=email_row["purpose"],
                confidence=email_row["confidence"],
                source_url=email_row["source_url"],
                evidence_quote=email_row["evidence_quote"],
                created_at=email_row["created_at"]
            ))

        # Get contact pages
        cursor.execute("SELECT * FROM contact_pages WHERE company_id = ?", (company.id,))
        for page_row in cursor.fetchall():
            company.contact_pages.append(ContactPage(
                id=page_row["id"],
                company_id=page_row["company_id"],
                url=page_row["url"],
                page_type=page_row["page_type"]
            ))

        return company

    finally:
        conn.close()


def list_companies(limit: int = 50, offset: int = 0) -> List[Company]:
    """List all companies with pagination."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT * FROM companies
            ORDER BY updated_at DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))

        companies = []
        for row in cursor.fetchall():
            company = Company(
                id=row["id"],
                name=row["name"],
                domain=row["domain"],
                notes=json.loads(row["notes"]) if row["notes"] else [],
                status=row["status"],
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            )

            # Get email count
            cursor.execute("SELECT COUNT(*) FROM emails WHERE company_id = ?", (company.id,))
            email_count = cursor.fetchone()[0]

            # Get emails
            cursor.execute("SELECT * FROM emails WHERE company_id = ?", (company.id,))
            for email_row in cursor.fetchall():
                company.emails.append(Email(
                    id=email_row["id"],
                    company_id=email_row["company_id"],
                    email=email_row["email"],
                    purpose=email_row["purpose"],
                    confidence=email_row["confidence"],
                    source_url=email_row["source_url"],
                    evidence_quote=email_row["evidence_quote"]
                ))

            companies.append(company)

        return companies

    finally:
        conn.close()


def log_search_run(company_id: int, status: str, error_message: str = None) -> int:
    """Log a search run for audit purposes."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO search_runs (company_id, status, started_at, completed_at, error_message)
            VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)
        """, (
            company_id,
            status,
            datetime.now().isoformat() if status in ["completed", "failed"] else None,
            error_message
        ))
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


# Initialize database on import
init_db()
