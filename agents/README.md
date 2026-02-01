# Agents Directory

Two main tools for company research and outreach.

## Directory Structure

```
agents/
├── company_discovery/     # Discover companies by industry
├── email_research/        # Research company contact emails
├── venv/                  # Shared virtual environment
└── .streamlit/            # Shared API keys
```

## 1. Company Discovery

**Purpose:** Find companies by industry keyword and save to CSV

**Location:** `company_discovery/`

**Run:**
```bash
cd company_discovery
streamlit run Home.py
```

**Output:** `discovered_companies.csv` with name, domain, description

**Features:**
- Industry keyword search
- Region filtering
- Automatic deduplication
- CSV export

---

## 2. Email Research

**Purpose:** Research public contact emails from company domains

**Location:** `email_research/`

**Apps:**
- `research_app.py` - Single company research
- `batch_research_app.py` - Batch process from CSV

**Run:**
```bash
cd email_research
streamlit run research_app.py
# OR
streamlit run batch_research_app.py
```

**Features:**
- Finds emails from official pages
- Source verification (URL + evidence)
- Category classification
- CSV/JSON export

---

## Setup

### 1. Virtual Environment
```bash
cd agents
source venv/bin/activate  # Already exists
```

### 2. API Keys
Add to `agents/.streamlit/secrets.toml`:
```toml
PPLX_API_KEY = "pplx-your-key"
HUNTER_API_KEY = "hunter-key-if-needed"
```

### 3. Install Dependencies
```bash
# For company discovery
pip install streamlit pandas langchain-perplexity

# For email research (if using Hunter.io)
pip install requests
```

---

## Workflow

1. **Discover Companies**
   ```bash
   cd company_discovery
   streamlit run Home.py
   ```
   - Search for "robotics" companies
   - Export to `discovered_companies.csv`

2. **Research Emails**
   ```bash
   cd email_research
   streamlit run batch_research_app.py
   ```
   - Upload the `discovered_companies.csv`
   - Get emails for each domain
   - Export results

---

## Files

### Company Discovery
- `Home.py` - Main dashboard
- `pages/1_Search.py` - Discovery interface
- `pages/2_Results.py` - View/export
- `pages/3_History.py` - Run history
- `pages/4_Settings.py` - Configuration
- `discovery.py` - Perplexity AI integration
- `database.py` - SQLite storage

### Email Research
- `research_app.py` - Single company UI
- `batch_research_app.py` - Batch processing UI
- `company_researcher.py` - Perplexity email research
- `models.py` - Database models
- `api.py` - FastAPI backend (optional)
