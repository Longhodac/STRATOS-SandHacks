"""
Settings page - View configuration and manage data.
"""

import streamlit as st
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from database import init_db, DB_PATH
from discovery import CSV_OUTPUT, get_csv_companies

init_db()

st.set_page_config(page_title="Settings - Company Discovery", layout="wide")

st.title("Settings")

# Output file info
st.header("Output File")

st.markdown(f"**CSV Path:** `{CSV_OUTPUT}`")

companies = get_csv_companies()
st.markdown(f"**Companies:** {len(companies)}")

if companies:
    industries = set(c.get('industry', '') for c in companies if c.get('industry'))
    st.markdown(f"**Industries:** {', '.join(industries) if industries else 'None'}")

st.markdown("---")

# Database info
st.header("Database")

st.markdown(f"**Database Path:** `{DB_PATH}`")

# Clear data options
st.markdown("---")
st.header("Data Management")

col1, col2 = st.columns(2)

with col1:
    st.subheader("Clear CSV")
    st.markdown("Remove all companies from the CSV file.")

    if st.button("Clear CSV File"):
        if CSV_OUTPUT.exists():
            CSV_OUTPUT.unlink()
            st.success("CSV file deleted")
            st.rerun()
        else:
            st.info("CSV file doesn't exist")

with col2:
    st.subheader("Reset Database")
    st.markdown("Delete the SQLite database (run history).")

    if st.button("Reset Database"):
        import os
        if DB_PATH.exists():
            os.remove(DB_PATH)
            init_db()
            st.success("Database reset")
            st.rerun()
        else:
            st.info("Database doesn't exist")

# API Key info
st.markdown("---")
st.header("API Configuration")

if "PPLX_API_KEY" in st.secrets:
    st.success("Perplexity API key is configured in secrets")
else:
    st.warning("No API key in secrets")
    st.markdown("""
    To configure, create `.streamlit/secrets.toml`:
    ```toml
    PPLX_API_KEY = "pplx-your-key-here"
    ```
    """)
