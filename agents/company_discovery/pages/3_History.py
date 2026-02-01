"""
History page - View previous discovery runs.
"""

import streamlit as st
import pandas as pd
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from database import list_runs, get_run, get_companies_for_run, init_db
from discovery import run_discovery

init_db()

st.set_page_config(page_title="History - Company Discovery", layout="wide")

st.title("Search History")
st.markdown("View previous discovery runs.")

# Sidebar - API Key for reruns
st.sidebar.header("Configuration")

api_key = None
if "PPLX_API_KEY" in st.secrets:
    api_key = st.secrets["PPLX_API_KEY"]
    st.sidebar.success("API key loaded")
else:
    api_key = st.sidebar.text_input(
        "Perplexity API Key",
        type="password",
        placeholder="pplx-...",
        help="Required for reruns"
    )

if st.button("Refresh"):
    st.rerun()

runs = list_runs(limit=50)

if not runs:
    st.info("No discovery runs yet. Use the Search page to start.")
else:
    # Summary table
    st.subheader("All Runs")

    run_data = []
    for run in runs:
        run_data.append({
            "ID": run.id,
            "Keyword": run.keyword,
            "Region": run.region or "-",
            "Companies": run.companies_found,
            "Status": run.status,
            "Started": run.started_at
        })

    df = pd.DataFrame(run_data)
    st.dataframe(df, use_container_width=True, hide_index=True)

    # Detail view
    st.markdown("---")
    st.subheader("Run Details")

    selected_run_id = st.selectbox(
        "Select run to view details",
        options=[r.id for r in runs],
        format_func=lambda x: f"Run {x}: {next((r.keyword for r in runs if r.id == x), 'Unknown')}"
    )

    if selected_run_id:
        run = get_run(selected_run_id)

        if run:
            col1, col2, col3 = st.columns(3)

            with col1:
                st.metric("Keyword", run.keyword)
            with col2:
                st.metric("Region", run.region or "All")
            with col3:
                st.metric("Companies Found", run.companies_found)

            st.markdown(f"**Status:** {run.status}")
            st.markdown(f"**Max Companies:** {run.max_companies}")
            st.markdown(f"**Started:** {run.started_at}")

            if run.error_message:
                st.error(f"Error: {run.error_message}")

            # Companies from this run
            companies = get_companies_for_run(selected_run_id)

            if companies:
                st.markdown("---")
                st.subheader(f"Companies from Run {selected_run_id}")

                for company in companies:
                    st.markdown(f"- **{company.name}** - [{company.domain}](https://{company.domain})")

            # Rerun button
            st.markdown("---")
            st.subheader("Rerun Search")

            new_max = st.number_input(
                "Max Companies",
                min_value=5,
                max_value=100,
                value=run.max_companies,
                step=5
            )

            if st.button("Rerun This Search", type="primary"):
                if not api_key:
                    st.error("Please provide a Perplexity API key in the sidebar")
                else:
                    with st.spinner(f"Rerunning search for '{run.keyword}'..."):
                        try:
                            new_run_id, new_companies, added, skipped = run_discovery(
                                keyword=run.keyword,
                                region=run.region,
                                max_companies=new_max,
                                api_key=api_key
                            )

                            st.success(f"Rerun complete! Found {len(new_companies)} companies ({added} new, {skipped} duplicates).")
                            st.rerun()

                        except Exception as e:
                            st.error(f"Error: {str(e)}")
