"""
Batch company research app.
Upload a list of domains and research them all.
"""

import streamlit as st
import pandas as pd
from datetime import datetime
import time
import io

import company_researcher
from models import list_companies, get_company, init_db

# Initialize database
init_db()

# Page configuration
st.set_page_config(
    page_title="Batch Company Research",
    page_icon=None,
    layout="wide"
)

st.title("Batch Company Research")
st.markdown("Upload a list of company domains to research all at once.")

# Sidebar for configuration
st.sidebar.header("Configuration")

# API Key handling
api_key = None
if "PPLX_API_KEY" in st.secrets:
    api_key = st.secrets["PPLX_API_KEY"]
    st.sidebar.success("API key loaded from secrets")
else:
    st.sidebar.warning("No API key in secrets")
    api_key = st.sidebar.text_input(
        "Perplexity API Key",
        type="password",
        placeholder="pplx-...",
        help="Get your key from https://www.perplexity.ai/settings/api"
    )

# Rate limiting
delay_seconds = st.sidebar.slider(
    "Delay between requests (seconds)",
    min_value=1,
    max_value=10,
    value=2,
    help="Avoid rate limiting by adding delay between API calls"
)

st.sidebar.markdown("---")
st.sidebar.info("""
**Input formats supported:**
- CSV with 'domain' column
- CSV with 'company' and 'domain' columns
- Plain text (one domain per line)
""")

# Main content
tab1, tab2 = st.tabs(["Upload & Research", "Results"])

with tab1:
    st.header("Input Companies")

    input_method = st.radio(
        "Input method",
        ["Paste domains", "Upload CSV"],
        horizontal=True
    )

    companies_to_research = []

    if input_method == "Paste domains":
        st.markdown("Enter one domain per line. Optionally add company name with comma: `Company Name, domain.com`")

        domains_text = st.text_area(
            "Domains",
            height=200,
            placeholder="stripe.com\nShopify, shopify.com\nairbnb.com\nslack.com"
        )

        if domains_text:
            lines = domains_text.strip().split("\n")
            for line in lines:
                line = line.strip()
                if not line:
                    continue

                if "," in line:
                    parts = line.split(",", 1)
                    company_name = parts[0].strip()
                    domain = parts[1].strip()
                else:
                    domain = line
                    # Extract company name from domain
                    company_name = domain.split(".")[0].title()

                companies_to_research.append({
                    "company": company_name,
                    "domain": domain
                })

    else:  # Upload CSV
        uploaded_file = st.file_uploader(
            "Upload CSV",
            type=["csv"],
            help="CSV should have 'domain' column. Optional: 'company' column for company names."
        )

        if uploaded_file:
            try:
                df = pd.read_csv(uploaded_file)

                # Find domain column
                domain_col = None
                for col in df.columns:
                    if col.lower() in ["domain", "website", "url", "site"]:
                        domain_col = col
                        break

                if not domain_col:
                    st.error("CSV must have a 'domain' column")
                else:
                    # Find company column
                    company_col = None
                    for col in df.columns:
                        if col.lower() in ["company", "name", "company_name", "organization"]:
                            company_col = col
                            break

                    for _, row in df.iterrows():
                        domain = str(row[domain_col]).strip()
                        if not domain or domain == "nan":
                            continue

                        # Clean domain
                        domain = domain.replace("https://", "").replace("http://", "").replace("www.", "").rstrip("/")

                        if company_col:
                            company_name = str(row[company_col]).strip()
                            if company_name == "nan":
                                company_name = domain.split(".")[0].title()
                        else:
                            company_name = domain.split(".")[0].title()

                        companies_to_research.append({
                            "company": company_name,
                            "domain": domain
                        })

                    st.success(f"Loaded {len(companies_to_research)} companies from CSV")

            except Exception as e:
                st.error(f"Error reading CSV: {str(e)}")

    # Preview
    if companies_to_research:
        st.subheader(f"Preview ({len(companies_to_research)} companies)")

        preview_df = pd.DataFrame(companies_to_research)
        st.dataframe(preview_df, use_container_width=True, hide_index=True)

        # Check for cached results
        cached_count = 0
        for item in companies_to_research:
            cached = get_company(item["domain"])
            if cached and cached.status == "completed":
                cached_count += 1

        if cached_count > 0:
            st.info(f"{cached_count} companies already have cached results. Use 'Force refresh' to re-research them.")

        col1, col2 = st.columns(2)
        with col1:
            force_refresh = st.checkbox("Force refresh all (bypass cache)")
        with col2:
            skip_cached = st.checkbox("Skip cached results", value=True)

        # Start research button
        if st.button("Start Batch Research", type="primary", use_container_width=True):
            if not api_key:
                st.error("Please provide an API key in the sidebar")
            else:
                # Progress tracking
                progress_bar = st.progress(0)
                status_text = st.empty()
                results_container = st.container()

                successful = 0
                failed = 0
                skipped = 0

                for i, item in enumerate(companies_to_research):
                    company_name = item["company"]
                    domain = item["domain"]

                    # Update progress
                    progress = (i + 1) / len(companies_to_research)
                    progress_bar.progress(progress)
                    status_text.text(f"Processing {i+1}/{len(companies_to_research)}: {company_name} ({domain})")

                    # Check cache
                    if skip_cached and not force_refresh:
                        cached = get_company(domain)
                        if cached and cached.status == "completed":
                            skipped += 1
                            continue

                    try:
                        company = company_researcher.research_company(
                            company_name=company_name,
                            domain=domain,
                            api_key=api_key,
                            force_refresh=force_refresh
                        )

                        if company.status == "completed":
                            successful += 1
                        else:
                            failed += 1

                    except Exception as e:
                        failed += 1
                        with results_container:
                            st.warning(f"Failed: {company_name} - {str(e)}")

                    # Rate limiting delay
                    if i < len(companies_to_research) - 1:
                        time.sleep(delay_seconds)

                # Final status
                progress_bar.progress(1.0)
                status_text.text("Complete!")

                st.success(f"Batch complete: {successful} successful, {failed} failed, {skipped} skipped")
                st.info("Go to the 'Results' tab to view and export all data.")

with tab2:
    st.header("Results")

    if st.button("Refresh Results"):
        st.rerun()

    companies = list_companies(limit=200)

    if not companies:
        st.info("No companies researched yet.")
    else:
        # Summary stats
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Companies", len(companies))
        with col2:
            total_emails = sum(len(c.emails) for c in companies)
            st.metric("Total Emails", total_emails)
        with col3:
            high_conf = sum(len([e for e in c.emails if e.confidence == "high"]) for c in companies)
            st.metric("High Confidence", high_conf)
        with col4:
            completed = len([c for c in companies if c.status == "completed"])
            st.metric("Completed", f"{completed}/{len(companies)}")

        # Results table
        st.subheader("All Emails Found")

        all_emails = []
        for company in companies:
            for email in company.emails:
                all_emails.append({
                    "Company": company.name,
                    "Domain": company.domain,
                    "Email": email.email,
                    "Purpose": email.purpose,
                    "Confidence": email.confidence,
                    "Source URL": email.source_url,
                    "Evidence": email.evidence_quote[:80] + "..." if email.evidence_quote and len(email.evidence_quote) > 80 else email.evidence_quote
                })

        if all_emails:
            df = pd.DataFrame(all_emails)

            # Filters
            col1, col2 = st.columns(2)
            with col1:
                confidence_filter = st.multiselect(
                    "Filter by confidence",
                    ["high", "medium", "low"],
                    default=["high", "medium", "low"]
                )
            with col2:
                search_filter = st.text_input("Search", placeholder="Filter by company, email, or purpose")

            # Apply filters
            filtered_df = df[df["Confidence"].isin(confidence_filter)]
            if search_filter:
                mask = (
                    filtered_df["Company"].str.contains(search_filter, case=False, na=False) |
                    filtered_df["Email"].str.contains(search_filter, case=False, na=False) |
                    filtered_df["Purpose"].str.contains(search_filter, case=False, na=False)
                )
                filtered_df = filtered_df[mask]

            st.dataframe(
                filtered_df,
                use_container_width=True,
                hide_index=True,
                column_config={
                    "Source URL": st.column_config.LinkColumn("Source URL")
                }
            )

            # Export
            st.subheader("Export")

            col1, col2 = st.columns(2)

            with col1:
                csv = filtered_df.to_csv(index=False)
                st.download_button(
                    label="Download CSV",
                    data=csv,
                    file_name=f"company_emails_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                    mime="text/csv",
                    use_container_width=True
                )

            with col2:
                # Export as JSON
                import json
                json_data = []
                for company in companies:
                    if company.emails:  # Only include companies with emails
                        json_data.append({
                            "company": company.name,
                            "domain": company.domain,
                            "emails": [
                                {
                                    "email": e.email,
                                    "purpose": e.purpose,
                                    "confidence": e.confidence,
                                    "source_url": e.source_url,
                                    "evidence_quote": e.evidence_quote
                                }
                                for e in company.emails
                            ]
                        })

                json_str = json.dumps(json_data, indent=2)
                st.download_button(
                    label="Download JSON",
                    data=json_str,
                    file_name=f"company_emails_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                    mime="application/json",
                    use_container_width=True
                )
        else:
            st.info("No emails found yet.")

        # Companies without emails
        no_emails = [c for c in companies if not c.emails]
        if no_emails:
            with st.expander(f"Companies without emails ({len(no_emails)})"):
                for c in no_emails:
                    st.markdown(f"- {c.name} ({c.domain}) - Status: {c.status}")

# Footer
st.markdown("---")
st.caption("""
**Tips:**
- Add delay between requests to avoid rate limiting
- Use 'Skip cached' to avoid re-researching companies you already have
- High confidence emails have verified source URLs
""")
