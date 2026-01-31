import streamlit as st
from playwright.sync_api import sync_playwright
import re
import pandas as pd
import time

# --- CONFIGURATION ---
# Regex to find emails
EMAIL_REGEX = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"

# Common pages where emails hide
LIKELY_PAGES = ["contact", "about", "about-us", "team", "careers", "press", "media", "investor-relations"]

def extract_emails(text):
    return set(re.findall(EMAIL_REGEX, text))

def smart_scrape(url):
    logs = []
    collected_emails = []
    
    # Ensure URL formatting
    if not url.startswith("http"):
        url = "https://" + url
    
    domain = url.split("//")[-1].split("/")[0]

    with sync_playwright() as p:
        logs.append("🚀 Launching Headless Browser...")
        
        # Launch options: Headless=True (fast), but you can set False to watch it work
        browser = p.chromium.launch(headless=True)
        
        # Context with User Agent to look like a real human
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        # List of URLs to try: Homepage + Likely Subpages
        urls_to_try = [url] + [f"{url.rstrip('/')}/{path}" for path in LIKELY_PAGES]

        # Limit to first 4 likely pages to save time
        for target in urls_to_try[:5]: 
            try:
                logs.append(f"Trying: {target}")
                
                # 1. Navigate and WAIT for network idle (Critical for React sites)
                page.goto(target, timeout=10000, wait_until="domcontentloaded")
                
                # Small human pause to let JS render
                time.sleep(2) 
                
                # 2. Extract Text
                content = page.content()
                text_content = page.inner_text("body") # Better than .content() for text
                
                # 3. Find Emails
                found = extract_emails(content) # Check HTML code
                found.update(extract_emails(text_content)) # Check visible text
                
                if found:
                    logs.append(f"✅ Found {len(found)} emails on {target}")
                    for email in found:
                        # Filter out garbage (images, excessive length)
                        if len(email) < 50 and domain.split('.')[-2] in email: 
                             # Only keep emails that match the domain (optional strict mode)
                             collected_emails.append({"email": email, "source": target})
                        else:
                             # Keep generic ones too
                             collected_emails.append({"email": email, "source": target})
                
            except Exception as e:
                logs.append(f"⚠️ Skipped {target}: {str(e)[:50]}...")

        # 4. Take a screenshot of the last page for debugging
        screenshot = page.screenshot()
        
        browser.close()
        
    return collected_emails, logs, screenshot

# --- STREAMLIT UI ---
st.set_page_config(page_title="Deep Email Agent", layout="wide")

st.title("🕵️ Deep Discovery Agent v2")
st.markdown("Improved with Smart Waits and Direct Page guessing.")

target_url = st.text_input("Company URL", placeholder="nvidia.com")

if st.button("Run Deep Scan"):
    if not target_url:
        st.error("Enter a URL")
    else:
        with st.spinner("Agent is navigating multiple pages..."):
            results, logs, screenshot = smart_scrape(target_url)
            
            col1, col2 = st.columns([2, 1])
            
            with col1:
                st.subheader("📬 Findings")
                if results:
                    df = pd.DataFrame(results).drop_duplicates()
                    st.dataframe(df, use_container_width=True)
                else:
                    st.warning("No emails found. Bot view:")
                    st.image(screenshot, caption="What the bot saw", width=400)
            
            with col2:
                st.subheader("⚙️ Execution Logs")
                for log in logs:
                    st.code(log, language="text")