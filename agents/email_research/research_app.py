"""
Streamlit app for company contact research.
Uses Perplexity AI to find public company emails with source citations.
"""

import streamlit as st
import pandas as pd
from datetime import datetime

import company_researcher
from models import list_companies, get_company, get_company_by_id, init_db

# Initialize database
init_db()

# Page configuration
st.set_page_config(
    page_title="Company Contact Researcher",
    page_icon=None,
    layout="wide"
)

st.title("Company Contact Researcher")
st.markdown("Find public company contact emails with verified sources using Perplexity AI.")

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

st.sidebar.markdown("---")
st.sidebar.info("""
**What this searches for:**
- Official contact emails
- Press/Media contacts
- Security/Trust contacts
- Legal/Privacy contacts
- Support contacts

**What it does NOT include:**
- Personal employee emails
- Guessed email formats
- LinkedIn scraped data
""")

# Main tabs
tab1, tab2, tab3 = st.tabs(["Research", "History", "Export"])

# Tab 1: Research
with tab1:
    st.header("Research Company")

    col1, col2 = st.columns(2)

    with col1:
        company_name = st.text_input(
            "Company Name",
            placeholder="e.g., Stripe",
            help="The company name to research"
        )

    with col2:
        domain = st.text_input(
            "Company Domain",
            placeholder="e.g., stripe.com",
            help="The company's main domain"
        )

    col3, col4 = st.columns(2)

    with col3:
        force_refresh = st.checkbox(
            "Force refresh (bypass cache)",
            value=False,
            help="Re-research even if we have cached results"
        )

    with col4:
        pass

    if st.button("Research Company", type="primary", use_container_width=True):
        if not api_key:
            st.error("Please provide an API key in the sidebar")
        elif not company_name or not domain:
            st.error("Please enter both company name and domain")
        else:
            try:
                with st.spinner(f"Researching {company_name}..."):
                    company = company_researcher.research_company(
                        company_name=company_name,
                        domain=domain,
                        api_key=api_key,
                        force_refresh=force_refresh
                    )

                if company.status == "completed":
                    st.success(f"Found {len(company.emails)} email(s) for {company.name}")

                    # Display emails
                    if company.emails:
                        st.subheader("Emails Found")

                        email_data = []
                        for email in company.emails:
                            email_data.append({
                                "Email": email.email,
                                "Purpose": email.purpose,
                                "Confidence": email.confidence,
                                "Source URL": email.source_url,
                                "Evidence": email.evidence_quote[:100] + "..." if email.evidence_quote and len(email.evidence_quote) > 100 else email.evidence_quote
                            })

                        df = pd.DataFrame(email_data)
                        st.dataframe(
                            df,
                            use_container_width=True,
                            hide_index=True,
                            column_config={
                                "Source URL": st.column_config.LinkColumn("Source URL"),
                                "Confidence": st.column_config.TextColumn("Confidence")
                            }
                        )
                    else:
                        st.warning("No emails found")

                    # Display contact pages
                    if company.contact_pages:
                        st.subheader("Contact Pages")

                        page_data = []
                        for page in company.contact_pages:
                            page_data.append({
                                "URL": page.url,
                                "Type": page.page_type
                            })

                        df_pages = pd.DataFrame(page_data)
                        st.dataframe(
                            df_pages,
                            use_container_width=True,
                            hide_index=True,
                            column_config={
                                "URL": st.column_config.LinkColumn("URL")
                            }
                        )

                    # Display notes
                    if company.notes:
                        st.subheader("Notes")
                        for note in company.notes:
                            st.markdown(f"- {note}")

                    # Show raw response in expander
                    if company.raw_response:
                        with st.expander("Raw API Response"):
                            st.code(company.raw_response, language="json")

                elif company.status == "failed":
                    st.error("Research failed")
                    if company.notes:
                        for note in company.notes:
                            st.warning(note)

            except Exception as e:
                st.error(f"Error: {str(e)}")

# Tab 2: History
with tab2:
    st.header("Research History")

    if st.button("Refresh History"):
        st.rerun()

    companies = list_companies(limit=50)

    if not companies:
        st.info("No companies researched yet. Use the Research tab to get started.")
    else:
        # Summary table
        history_data = []
        for company in companies:
            history_data.append({
                "ID": company.id,
                "Company": company.name,
                "Domain": company.domain,
                "Emails": len(company.emails),
                "Status": company.status,
                "Updated": company.updated_at
            })

        df_history = pd.DataFrame(history_data)
        st.dataframe(
            df_history,
            use_container_width=True,
            hide_index=True
        )

        # Detail view
        st.subheader("View Details")
        selected_id = st.selectbox(
            "Select company to view",
            options=[c.id for c in companies],
            format_func=lambda x: next((c.name for c in companies if c.id == x), str(x))
        )

        if selected_id:
            company = get_company_by_id(selected_id)
            if company:
                st.markdown(f"**{company.name}** ({company.domain})")
                st.markdown(f"Status: {company.status}")

                if company.emails:
                    st.markdown("**Emails:**")
                    for email in company.emails:
                        with st.expander(f"{email.email} ({email.confidence})"):
                            st.markdown(f"**Purpose:** {email.purpose}")
                            st.markdown(f"**Source:** [{email.source_url}]({email.source_url})")
                            st.markdown(f"**Evidence:** {email.evidence_quote}")

# Tab 3: Export
with tab3:
    st.header("Export Data")

    companies = list_companies(limit=100)

    if not companies:
        st.info("No data to export yet.")
    else:
        # Prepare export data
        export_data = []
        for company in companies:
            for email in company.emails:
                export_data.append({
                    "Company": company.name,
                    "Domain": company.domain,
                    "Email": email.email,
                    "Purpose": email.purpose,
                    "Confidence": email.confidence,
                    "Source URL": email.source_url,
                    "Evidence": email.evidence_quote
                })

        if export_data:
            df_export = pd.DataFrame(export_data)

            st.dataframe(df_export, use_container_width=True, hide_index=True)

            # CSV download
            csv = df_export.to_csv(index=False)
            st.download_button(
                label="Download CSV",
                data=csv,
                file_name=f"company_contacts_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv",
                use_container_width=True
            )

            # JSON download
            json_data = []
            for company in companies:
                company_json = {
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
                    ],
                    "contact_pages": [
                        {"url": p.url, "type": p.page_type}
                        for p in company.contact_pages
                    ],
                    "notes": company.notes
                }
                json_data.append(company_json)

            import json
            json_str = json.dumps(json_data, indent=2)
            st.download_button(
                label="Download JSON",
                data=json_str,
                file_name=f"company_contacts_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                mime="application/json",
                use_container_width=True
            )
        else:
            st.info("No emails found in any researched companies.")

# Footer
st.markdown("---")
st.caption("""
**Compliance Notes:**
- Only searches public, official company pages
- No LinkedIn scraping or personal emails
- All emails include source URLs for verification
- Results are cached to reduce API calls
""")
