"""
Selenium Email Scraper - Streamlit App
Scrapes emails from company websites using Selenium.
"""

import streamlit as st
import pandas as pd
import re
import time
import random
import json
import sqlite3
import sys
import os
from datetime import datetime
from pathlib import Path

# Selenium imports
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, WebDriverException

try:
    from webdriver_manager.chrome import ChromeDriverManager
    WEBDRIVER_MANAGER_AVAILABLE = True
except ImportError:
    WEBDRIVER_MANAGER_AVAILABLE = False

# Add path to company_discovery module
# Use .resolve() to get the true absolute path regardless of working directory
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.append(str(SCRIPT_DIR.parent / "company_discovery"))
DISCOVERY_DB_PATH = SCRIPT_DIR.parent / "company_discovery" / "company_discovery.db"

# Database setup
DB_PATH = Path(__file__).parent / "scraped_emails.db"

def init_db():
    """Initialize SQLite database for storing scraped emails."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scraped_emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT NOT NULL,
            company_name TEXT,
            email TEXT NOT NULL,
            source_url TEXT,
            scraped_at TEXT NOT NULL,
            UNIQUE(domain, email)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scrape_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT NOT NULL,
            company_name TEXT,
            status TEXT DEFAULT 'pending',
            emails_found INTEGER DEFAULT 0,
            pages_visited INTEGER DEFAULT 0,
            error_message TEXT,
            started_at TEXT NOT NULL,
            completed_at TEXT
        )
    """)
    conn.commit()
    conn.close()

def save_email(domain: str, company_name: str, email: str, source_url: str):
    """Save an email to the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO scraped_emails (domain, company_name, email, source_url, scraped_at)
            VALUES (?, ?, ?, ?, ?)
        """, (domain, company_name, email, source_url, datetime.now().isoformat()))
        conn.commit()
    finally:
        conn.close()

def get_emails_for_domain(domain: str) -> list:
    """Get all emails for a domain."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT email, source_url, scraped_at FROM scraped_emails WHERE domain = ?
    """, (domain,))
    rows = cursor.fetchall()
    conn.close()
    return [{"email": r[0], "source_url": r[1], "scraped_at": r[2]} for r in rows]

def get_all_emails() -> list:
    """Get all scraped emails."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT domain, company_name, email, source_url, scraped_at FROM scraped_emails
        ORDER BY scraped_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [{"domain": r[0], "company_name": r[1], "email": r[2], "source_url": r[3], "scraped_at": r[4]} for r in rows]

def create_scrape_run(domain: str, company_name: str) -> int:
    """Create a new scrape run record."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO scrape_runs (domain, company_name, status, started_at)
        VALUES (?, ?, 'running', ?)
    """, (domain, company_name, datetime.now().isoformat()))
    run_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return run_id

def update_scrape_run(run_id: int, status: str, emails_found: int, pages_visited: int, error_message: str = None):
    """Update a scrape run record."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE scrape_runs
        SET status = ?, emails_found = ?, pages_visited = ?, error_message = ?, completed_at = ?
        WHERE id = ?
    """, (status, emails_found, pages_visited, error_message, datetime.now().isoformat(), run_id))
    conn.commit()
    conn.close()

def get_scrape_history(limit: int = 50) -> list:
    """Get scrape run history."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, domain, company_name, status, emails_found, pages_visited, error_message, started_at, completed_at
        FROM scrape_runs ORDER BY started_at DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [{
        "id": r[0], "domain": r[1], "company_name": r[2], "status": r[3],
        "emails_found": r[4], "pages_visited": r[5], "error_message": r[6],
        "started_at": r[7], "completed_at": r[8]
    } for r in rows]


def load_companies_from_discovery() -> list:
    """Load all companies from the company_discovery database."""
    if not DISCOVERY_DB_PATH.exists():
        return []
    
    try:
        conn = sqlite3.connect(DISCOVERY_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT name, domain, industry, region, status
            FROM companies
            ORDER BY name
        """)
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "name": r[0],
            "domain": r[1],
            "industry": r[2] or "",
            "region": r[3] or "",
            "status": r[4] or "unknown"
        } for r in rows]
    except Exception as e:
        st.error(f"Error loading companies from discovery database: {str(e)}")
        return []


def create_driver(headless: bool = True) -> webdriver.Chrome:
    """Create a Chrome WebDriver instance. Supports Docker when CHROME_BIN and CHROMEDRIVER_PATH are set."""
    options = Options()

    if headless:
        options.add_argument("--headless=new")

    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    # Use system Chrome/Chromium when in Docker (CHROME_BIN and CHROMEDRIVER_PATH set)
    chrome_bin = os.environ.get("CHROME_BIN")
    chromedriver_path = os.environ.get("CHROMEDRIVER_PATH")

    if chrome_bin:
        options.binary_location = chrome_bin

    if chromedriver_path:
        service = Service(chromedriver_path)
        driver = webdriver.Chrome(service=service, options=options)
    elif WEBDRIVER_MANAGER_AVAILABLE:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
    else:
        driver = webdriver.Chrome(options=options)

    return driver


def extract_emails_from_page(driver) -> set:
    """Extract emails from the current page."""
    emails = set()

    # Method 1: Find mailto links
    try:
        links = driver.find_elements(By.TAG_NAME, "a")
        for link in links:
            href = link.get_attribute("href") or ""
            if "mailto:" in href:
                email = href.replace("mailto:", "").split("?")[0].strip()
                if is_valid_email(email):
                    emails.add(email.lower())
    except Exception:
        pass

    # Method 2: Regex search in page source
    try:
        page_source = driver.page_source
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        found_emails = re.findall(email_pattern, page_source)
        for email in found_emails:
            if is_valid_email(email):
                emails.add(email.lower())
    except Exception:
        pass

    return emails


def is_valid_email(email: str) -> bool:
    """Check if an email is valid and not a common false positive."""
    if not email or len(email) < 5:
        return False

    # Filter out common false positives
    ignore_patterns = [
        '@example.com', '@test.com', '@localhost',
        '@sentry.io', '@wixpress.com', '@placeholder',
        '.png', '.jpg', '.gif', '.svg', '.css', '.js',
        '@2x', '@3x'  # Image resolution suffixes
    ]

    email_lower = email.lower()
    for pattern in ignore_patterns:
        if pattern in email_lower:
            return False

    # Basic structure check
    if '@' not in email or '.' not in email.split('@')[-1]:
        return False

    return True


def find_contact_pages(driver, base_url: str) -> list:
    """Find potential contact pages on the website."""
    contact_urls = []
    contact_keywords = ['contact', 'about', 'team', 'support', 'help', 'press', 'media', 'careers']

    try:
        links = driver.find_elements(By.TAG_NAME, "a")
        for link in links:
            href = link.get_attribute("href") or ""
            text = (link.text or "").lower()

            if not href.startswith("http"):
                continue

            # Check if link text or href contains contact keywords
            for keyword in contact_keywords:
                if keyword in href.lower() or keyword in text:
                    if href not in contact_urls and base_url.split("//")[-1].split("/")[0] in href:
                        contact_urls.append(href)
                        break
    except Exception:
        pass

    return contact_urls[:10]  # Limit to 10 pages


def scrape_website(domain: str, company_name: str, headless: bool = True,
                   max_pages: int = 5, delay_range: tuple = (2, 5),
                   progress_callback=None) -> dict:
    """
    Scrape a website for emails.

    Args:
        domain: The domain to scrape (e.g., "stripe.com")
        company_name: Company name for logging
        headless: Run browser in headless mode
        max_pages: Maximum number of pages to visit
        delay_range: Random delay range between requests (min, max) in seconds
        progress_callback: Optional callback for progress updates

    Returns:
        dict with emails found and metadata
    """
    run_id = create_scrape_run(domain, company_name)

    base_url = f"https://{domain}"
    all_emails = set()
    pages_visited = 0
    visited_urls = set()

    driver = None

    try:
        if progress_callback:
            progress_callback(f"Starting browser...")

        driver = create_driver(headless=headless)

        # Visit homepage
        if progress_callback:
            progress_callback(f"Visiting {base_url}...")

        driver.get(base_url)

        # Wait for page load
        WebDriverWait(driver, 10).until(
            lambda d: d.find_elements(By.TAG_NAME, "a")
        )

        time.sleep(random.uniform(*delay_range))
        pages_visited += 1
        visited_urls.add(base_url)

        # Extract emails from homepage
        emails = extract_emails_from_page(driver)
        for email in emails:
            all_emails.add(email)
            save_email(domain, company_name, email, base_url)

        if progress_callback:
            progress_callback(f"Homepage: Found {len(emails)} email(s). Finding contact pages...")

        # Find contact pages
        contact_pages = find_contact_pages(driver, base_url)

        # Visit contact pages
        for page_url in contact_pages[:max_pages - 1]:
            if page_url in visited_urls:
                continue

            try:
                if progress_callback:
                    progress_callback(f"Visiting {page_url}...")

                driver.get(page_url)

                WebDriverWait(driver, 10).until(
                    lambda d: d.find_elements(By.TAG_NAME, "body")
                )

                time.sleep(random.uniform(*delay_range))
                pages_visited += 1
                visited_urls.add(page_url)

                emails = extract_emails_from_page(driver)
                for email in emails:
                    all_emails.add(email)
                    save_email(domain, company_name, email, page_url)

                if progress_callback:
                    progress_callback(f"Found {len(emails)} email(s) on {page_url}")

            except TimeoutException:
                if progress_callback:
                    progress_callback(f"Timeout on {page_url}")
            except Exception as e:
                if progress_callback:
                    progress_callback(f"Error on {page_url}: {str(e)[:50]}")

        update_scrape_run(run_id, "completed", len(all_emails), pages_visited)

        return {
            "success": True,
            "domain": domain,
            "company_name": company_name,
            "emails": list(all_emails),
            "pages_visited": pages_visited,
            "urls_visited": list(visited_urls)
        }

    except Exception as e:
        error_msg = str(e)
        update_scrape_run(run_id, "failed", len(all_emails), pages_visited, error_msg)
        return {
            "success": False,
            "domain": domain,
            "company_name": company_name,
            "emails": list(all_emails),
            "pages_visited": pages_visited,
            "error": error_msg
        }
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass


# Initialize database
init_db()

# Page configuration
st.set_page_config(
    page_title="Selenium Email Scraper",
    page_icon=None,
    layout="wide"
)

st.title("Selenium Email Scraper")
st.markdown("Scrape emails from company websites using Selenium browser automation.")

# Sidebar
st.sidebar.header("Configuration")

headless_mode = st.sidebar.checkbox("Headless Mode", value=True, help="Run browser without visible window")
max_pages = st.sidebar.slider("Max Pages to Visit", 1, 10, 5, help="Maximum pages to scrape per website")
delay_min = st.sidebar.slider("Min Delay (seconds)", 1, 10, 2)
delay_max = st.sidebar.slider("Max Delay (seconds)", 2, 15, 5)

st.sidebar.markdown("---")
st.sidebar.info("""
**How it works:**
1. Opens the website in a browser
2. Extracts emails from mailto: links
3. Searches page source for email patterns
4. Visits contact/about pages
5. Stores unique emails in database
""")

# Main tabs
tab1, tab2, tab3, tab4 = st.tabs(["Single Scrape", "Batch Scrape", "History", "Export"])

# Tab 1: Single Scrape
with tab1:
    st.header("Scrape Single Website")

    col1, col2 = st.columns(2)

    with col1:
        domain = st.text_input(
            "Domain",
            placeholder="e.g., stripe.com",
            help="The domain to scrape (without https://)"
        )

    with col2:
        company_name = st.text_input(
            "Company Name (optional)",
            placeholder="e.g., Stripe",
            help="For labeling purposes"
        )

    if st.button("Start Scraping", type="primary", use_container_width=True):
        if not domain:
            st.error("Please enter a domain")
        else:
            # Clean domain
            domain = domain.replace("https://", "").replace("http://", "").strip("/")

            progress_placeholder = st.empty()
            status_placeholder = st.empty()

            def update_progress(msg):
                status_placeholder.info(msg)

            with st.spinner("Scraping..."):
                result = scrape_website(
                    domain=domain,
                    company_name=company_name or domain,
                    headless=headless_mode,
                    max_pages=max_pages,
                    delay_range=(delay_min, delay_max),
                    progress_callback=update_progress
                )

            if result["success"]:
                st.success(f"Completed! Found {len(result['emails'])} email(s) across {result['pages_visited']} page(s)")

                if result["emails"]:
                    st.subheader("Emails Found")
                    for email in result["emails"]:
                        st.code(email)
                else:
                    st.warning("No emails found on this website")

                with st.expander("Pages Visited"):
                    for url in result["urls_visited"]:
                        st.markdown(f"- {url}")
            else:
                st.error(f"Scraping failed: {result.get('error', 'Unknown error')}")
                if result["emails"]:
                    st.info(f"Partial results: Found {len(result['emails'])} email(s)")

# Tab 2: Batch Scrape
with tab2:
    st.header("Batch Scrape from Company Discovery")

    # Debug info
    st.caption(f"DEBUG: DB Path = {DISCOVERY_DB_PATH}")
    st.caption(f"DEBUG: DB Exists = {DISCOVERY_DB_PATH.exists()}")
    st.caption(f"DEBUG: Absolute Path = {DISCOVERY_DB_PATH.absolute()}")

    # Load companies from discovery database
    companies = load_companies_from_discovery()
    
    st.caption(f"DEBUG: Companies loaded = {len(companies)}")

    if not companies:
        st.warning("No companies found in company_discovery database.")
        st.info("Run the Company Discovery app first to populate the database.")
    else:
        st.success(f"Loaded {len(companies)} companies from company_discovery database")

        # Display companies in a dataframe with checkboxes
        df = pd.DataFrame(companies)
        
        # Selection controls
        col1, col2, col3 = st.columns([2, 2, 6])
        
        with col1:
            if st.button("Select All", use_container_width=True):
                st.session_state.selected_companies = list(range(len(companies)))
                st.rerun()
        
        with col2:
            if st.button("Deselect All", use_container_width=True):
                st.session_state.selected_companies = []
                st.rerun()
        
        # Initialize session state for selections
        if 'selected_companies' not in st.session_state:
            st.session_state.selected_companies = list(range(len(companies)))
        
        # Display companies with checkboxes
        st.subheader("Companies to Scrape")
        
        # Create a display dataframe with selection column
        display_data = []
        for i, company in enumerate(companies):
            selected = i in st.session_state.selected_companies
            display_data.append({
                "Select": selected,
                "Company": company["name"],
                "Domain": company["domain"],
                "Industry": company["industry"],
                "Region": company["region"]
            })
        
        display_df = pd.DataFrame(display_data)
        
        # Use data editor for selections
        edited_df = st.data_editor(
            display_df,
            use_container_width=True,
            hide_index=True,
            disabled=["Company", "Domain", "Industry", "Region"],
            column_config={
                "Select": st.column_config.CheckboxColumn(
                    "Select",
                    help="Check to scrape this company",
                    default=True
                )
            }
        )
        
        # Update session state based on edited dataframe
        st.session_state.selected_companies = [i for i, row in edited_df.iterrows() if row["Select"]]
        
        selected_count = len(st.session_state.selected_companies)
        st.info(f"Selected {selected_count} companies to scrape")
        
        # Start scraping button
        if st.button(f"Start Scraping {selected_count} Companies", type="primary", use_container_width=True, disabled=selected_count == 0):
            companies_to_scrape = [companies[i] for i in st.session_state.selected_companies]
            
            progress_bar = st.progress(0)
            status_text = st.empty()
            results_container = st.container()
            
            total = len(companies_to_scrape)
            all_results = []
            
            for i, company in enumerate(companies_to_scrape):
                domain = company.get("domain", "")
                name = company.get("name", domain)
                
                status_text.info(f"Scraping {i+1}/{total}: {name} ({domain})")
                
                result = scrape_website(
                    domain=domain,
                    company_name=name,
                    headless=headless_mode,
                    max_pages=max_pages,
                    delay_range=(delay_min, delay_max)
                )
                
                all_results.append(result)
                progress_bar.progress((i + 1) / total)
                
                # Brief pause between sites
                if i < total - 1:
                    time.sleep(random.uniform(1, 3))
            
            # Summary
            status_text.empty()
            
            successful = sum(1 for r in all_results if r["success"])
            total_emails = sum(len(r["emails"]) for r in all_results)
            
            st.success(f"Batch complete! {successful}/{total} successful, {total_emails} total emails found")
            
            # Results table
            results_data = []
            for r in all_results:
                results_data.append({
                    "Company": r["company_name"],
                    "Domain": r["domain"],
                    "Status": "Success" if r["success"] else "Failed",
                    "Emails Found": len(r["emails"]),
                    "Pages": r["pages_visited"]
                })
            
            st.dataframe(pd.DataFrame(results_data), use_container_width=True, hide_index=True)


# Tab 3: History
with tab3:
    st.header("Scrape History")

    if st.button("Refresh"):
        st.rerun()

    history = get_scrape_history()

    if history:
        history_df = pd.DataFrame(history)
        st.dataframe(history_df, use_container_width=True, hide_index=True)
    else:
        st.info("No scrape history yet.")

# Tab 4: Export
with tab4:
    st.header("Export Scraped Emails")

    emails = get_all_emails()

    if emails:
        df = pd.DataFrame(emails)
        st.dataframe(df, use_container_width=True, hide_index=True)

        # CSV download
        csv = df.to_csv(index=False)
        st.download_button(
            label="Download CSV",
            data=csv,
            file_name=f"scraped_emails_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv",
            use_container_width=True
        )

        # JSON download
        json_str = json.dumps(emails, indent=2)
        st.download_button(
            label="Download JSON",
            data=json_str,
            file_name=f"scraped_emails_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
            mime="application/json",
            use_container_width=True
        )

        # Stats
        st.subheader("Statistics")
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Total Emails", len(emails))
        with col2:
            st.metric("Unique Domains", len(set(e["domain"] for e in emails)))
        with col3:
            st.metric("Companies", len(set(e["company_name"] for e in emails if e["company_name"])))
    else:
        st.info("No emails scraped yet.")

# Footer
st.markdown("---")
st.caption("""
**Notes:**
- Uses Selenium with Chrome in headless mode by default
- Respects rate limiting with random delays
- Stores results in SQLite database
- Only extracts publicly visible emails
""")
