"""
Results page - View discovered companies and export.
"""

import streamlit as st
import pandas as pd
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from discovery import get_csv_companies, CSV_OUTPUT
from database import init_db

init_db()

st.set_page_config(page_title="Results - Company Discovery", layout="wide")

st.title("Results")
st.markdown("View and export discovered companies.")

if st.button("Refresh"):
    st.rerun()

companies = get_csv_companies()

if not companies:
    st.info("No companies discovered yet. Use the Search page to start.")
else:
    # Stats
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Companies", len(companies))
    with col2:
        industries = set(c.get('industry', '') for c in companies if c.get('industry'))
        st.metric("Industries", len(industries))
    with col3:
        regions = set(c.get('region', '') for c in companies if c.get('region'))
        st.metric("Regions", len(regions) if regions else "All")

    # Filters
    st.subheader("Filters")
    col1, col2, col3 = st.columns(3)

    with col1:
        industry_filter = st.multiselect(
            "Filter by Industry",
            options=list(industries),
            default=[]
        )

    with col2:
        region_options = [r for r in regions if r]
        region_filter = st.multiselect(
            "Filter by Region",
            options=region_options,
            default=[]
        )

    with col3:
        search_filter = st.text_input("Search", placeholder="Filter by name or domain")

    # Apply filters
    filtered = companies
    if industry_filter:
        filtered = [c for c in filtered if c.get('industry') in industry_filter]
    if region_filter:
        filtered = [c for c in filtered if c.get('region') in region_filter]
    if search_filter:
        search_lower = search_filter.lower()
        filtered = [c for c in filtered if
                   search_lower in c.get('name', '').lower() or
                   search_lower in c.get('domain', '').lower()]

    st.markdown(f"Showing {len(filtered)} of {len(companies)} companies")

    # Display table
    if filtered:
        df = pd.DataFrame(filtered)

        # Reorder columns
        columns = ['name', 'domain', 'industry', 'region', 'description', 'discovered_at']
        columns = [c for c in columns if c in df.columns]
        df = df[columns]

        st.dataframe(
            df,
            use_container_width=True,
            hide_index=True,
            column_config={
                "domain": st.column_config.LinkColumn(
                    "Domain",
                    display_text="https://(.*)",
                    help="Click to visit website"
                )
            }
        )

        # Export section
        st.markdown("---")
        st.subheader("Export")

        col1, col2 = st.columns(2)

        with col1:
            csv_data = df.to_csv(index=False)
            st.download_button(
                label="Download CSV",
                data=csv_data,
                file_name=f"companies_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv",
                use_container_width=True
            )

        with col2:
            import json
            json_data = json.dumps(filtered, indent=2)
            st.download_button(
                label="Download JSON",
                data=json_data,
                file_name=f"companies_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                mime="application/json",
                use_container_width=True
            )

        st.caption(f"Source file: {CSV_OUTPUT}")

    else:
        st.warning("No companies match your filters.")
