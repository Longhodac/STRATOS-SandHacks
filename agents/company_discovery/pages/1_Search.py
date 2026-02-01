"""
Search page - Discover companies by industry keyword.
"""

import streamlit as st
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from discovery import run_discovery, get_csv_companies, CSV_OUTPUT
from database import init_db

init_db()

st.set_page_config(page_title="Search - Company Discovery", layout="wide")

st.title("Search Companies")
st.markdown("Discover companies by industry keyword. Results are saved to CSV with automatic deduplication.")

# Sidebar - API Key
st.sidebar.header("Configuration")

api_key = None
if "PPLX_API_KEY" in st.secrets:
    api_key = st.secrets["PPLX_API_KEY"]
    st.sidebar.success("API key loaded")
else:
    api_key = st.sidebar.text_input(
        "Perplexity API Key",
        type="password",
        placeholder="pplx-..."
    )

# Main form
col1, col2 = st.columns(2)

with col1:
    keyword = st.text_input(
        "Industry Keyword",
        placeholder="e.g., robotics, semiconductors, fintech",
        help="Enter an industry or sector to search for companies"
    )

with col2:
    region = st.text_input(
        "Region (optional)",
        placeholder="e.g., California, Germany, Asia",
        help="Filter by geographic region"
    )

max_companies = st.slider(
    "Max Companies to Find",
    min_value=5,
    max_value=100,
    value=25,
    step=5
)

# Current CSV stats
st.markdown("---")
existing_companies = get_csv_companies()

col1, col2 = st.columns(2)
with col1:
    st.metric("Companies in CSV", len(existing_companies))
with col2:
    if CSV_OUTPUT.exists():
        st.caption(f"Output: {CSV_OUTPUT.name}")

# Search button
st.markdown("---")

if st.button("Discover Companies", type="primary", use_container_width=True):
    if not api_key:
        st.error("Please provide a Perplexity API key")
    elif not keyword:
        st.error("Please enter an industry keyword")
    else:
        # Progress tracking
        progress_bar = st.progress(0)
        status_text = st.empty()

        def progress_callback(stage: str, current: int, total: int, message: str):
            if total > 0:
                progress_bar.progress(current / total)
            status_text.text(message)

        try:
            run_id, companies, added_count, skipped_count = run_discovery(
                keyword=keyword,
                region=region,
                max_companies=max_companies,
                api_key=api_key,
                progress_callback=progress_callback
            )

            progress_bar.progress(1.0)
            status_text.text("Complete!")

            # Show results summary
            st.success(f"Discovery complete! Found {len(companies)} companies.")

            col1, col2 = st.columns(2)
            with col1:
                st.metric("Added to CSV", added_count)
            with col2:
                st.metric("Skipped (duplicates)", skipped_count)

            # Quick preview
            if companies:
                st.subheader("Companies Found")
                for company in companies[:15]:
                    st.markdown(f"- **{company.get('name')}** - [{company.get('domain')}](https://{company.get('domain')})")
                    st.caption(f"  {company.get('description', '')}")

                if len(companies) > 15:
                    st.info(f"Showing 15 of {len(companies)} companies. Go to Results page for full list.")

            st.markdown("---")
            st.markdown(f"**CSV updated:** `{CSV_OUTPUT}`")

        except Exception as e:
            st.error(f"Error: {str(e)}")
            progress_bar.empty()
            status_text.empty()

# Footer
st.markdown("---")
st.caption("""
**How it works:**
1. Perplexity AI searches for companies matching your keyword
2. Companies are deduplicated by domain
3. New companies are appended to the CSV file
4. Duplicates are automatically skipped
""")
