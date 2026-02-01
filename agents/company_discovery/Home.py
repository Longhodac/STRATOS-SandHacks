"""
Company Discovery App - Home Page
Discover companies by industry keyword and save to CSV.
"""

import streamlit as st
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from database import init_db, list_runs
from discovery import get_csv_companies, CSV_OUTPUT

init_db()

st.set_page_config(
    page_title="Company Discovery",
    page_icon=None,
    layout="wide"
)

st.title("Company Discovery")
st.markdown("Discover companies by industry keyword. Results saved to CSV with automatic deduplication.")

# Sidebar - API Key
st.sidebar.header("Configuration")

if "PPLX_API_KEY" in st.secrets:
    st.sidebar.success("API key loaded from secrets")
else:
    st.sidebar.warning("No API key in secrets")
    st.sidebar.markdown("""
    Add to `.streamlit/secrets.toml`:
    ```
    PPLX_API_KEY = "pplx-..."
    ```
    """)

# Dashboard
st.header("Dashboard")

companies = get_csv_companies()
runs = list_runs(limit=10)

col1, col2, col3 = st.columns(3)

with col1:
    st.metric("Companies in CSV", len(companies))

with col2:
    industries = set(c.get('industry', '') for c in companies if c.get('industry'))
    st.metric("Industries", len(industries))

with col3:
    st.metric("Discovery Runs", len(runs))

# Recent activity
st.markdown("---")
st.header("Recent Runs")

if runs:
    for run in runs[:5]:
        status_icon = "+" if run.status == "completed" else "..." if run.status == "running" else "x"
        st.markdown(
            f"[{status_icon}] **{run.keyword}** ({run.region or 'All regions'}) - "
            f"{run.companies_found} companies - *{run.started_at}*"
        )
else:
    st.info("No discovery runs yet. Go to the Search page to start.")

# Quick actions
st.markdown("---")
st.header("Quick Actions")

col1, col2 = st.columns(2)

with col1:
    if st.button("New Search", use_container_width=True):
        st.switch_page("pages/1_Search.py")

with col2:
    if st.button("View Results", use_container_width=True):
        st.switch_page("pages/2_Results.py")

# CSV file location
st.markdown("---")
st.header("Output File")

st.code(str(CSV_OUTPUT))

if CSV_OUTPUT.exists():
    st.caption(f"{len(companies)} companies in file")
else:
    st.caption("File will be created on first discovery")

# How it works
st.markdown("---")
st.header("How It Works")

st.markdown("""
1. **Search** - Enter an industry keyword (e.g., "robotics", "semiconductors")
2. **Discover** - Perplexity AI finds companies and their official websites
3. **Save** - Companies are saved to CSV with automatic deduplication
4. **Export** - Download results as CSV or JSON

**CSV Columns:**
- `name` - Company name
- `domain` - Official website domain
- `description` - Brief description
- `industry` - Search keyword used
- `region` - Region filter (if any)
- `discovered_at` - Timestamp

**Note:** This tool only discovers companies and their websites. Use a separate script to scan for emails.
""")

# Footer
st.markdown("---")
st.caption("Company Discovery Tool - Powered by Perplexity AI")
