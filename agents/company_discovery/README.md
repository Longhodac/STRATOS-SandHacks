# Company Discovery

Multipage Streamlit app that discovers companies by industry keyword and collects public contact emails with verified sources.

## Features

- **Industry Search** - Find companies by keyword (e.g., "robotics", "semiconductors")
- **Region Filtering** - Optional geographic filtering
- **Email Collection** - Extracts emails from official contact pages
- **Source Verification** - Every email includes source URL and evidence snippet
- **CSV Export** - Real-time CSV output, deduplicated automatically
- **Compliance** - Respects robots.txt, no LinkedIn scraping, no personal emails

## File Structure

```
company_discovery/
├── Home.py                 # Main entry point
├── pages/
│   ├── 1_Search.py        # Search and discovery
│   ├── 2_Results.py       # View and export results
│   ├── 3_History.py       # Previous runs
│   └── 4_Settings.py      # Configuration
├── database.py            # SQLite models and operations
├── crawler.py             # Web crawling and email extraction
├── discovery.py           # Perplexity AI company discovery
├── test_extraction.py     # Unit tests
├── requirements.txt       # Dependencies
└── README.md              # This file
```

## Installation

```bash
cd company_discovery

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Configuration

Create `.streamlit/secrets.toml`:

```toml
PPLX_API_KEY = "pplx-your-api-key-here"
```

Or enter the API key in the sidebar when running.

## Running

```bash
streamlit run Home.py
```

Open http://localhost:8501 in your browser.

## Usage

1. **Search Page** - Enter industry keyword and optional region
2. Click "Start Discovery"
3. Watch progress as companies are discovered and crawled
4. View results in the Results page
5. Export to CSV or JSON

## Output Files

The app creates two CSV files in the same directory:

- `discovered_companies.csv` - All discovered companies
- `discovered_emails.csv` - All extracted emails with sources

These files are updated in real-time as companies are processed, with automatic deduplication.

## CSV Columns

### Companies CSV
| Column | Description |
|--------|-------------|
| name | Company name |
| domain | Official website domain |
| description | Brief company description |
| industry | Search keyword used |
| region | Region filter used |
| status | Processing status |
| emails_found | Number of emails found |
| discovered_at | Timestamp |

### Emails CSV
| Column | Description |
|--------|-------------|
| company | Company name |
| domain | Company domain |
| email | Email address |
| category | sales, support, press, security, privacy, careers, other |
| confidence | high, medium, low |
| source_url | Page where email was found |
| evidence | Text snippet around email |
| discovered_at | Timestamp |

## Compliance

This tool follows these rules:

1. **robots.txt** - Respects disallow rules
2. **Rate limiting** - Configurable delay (default 2s)
3. **User-Agent** - Clearly identifies itself
4. **No LinkedIn** - Does not scrape social media
5. **No personal emails** - Only official company contacts
6. **Source tracking** - Every email has a verified source URL

### Allowed Paths

Only these paths are crawled:
- /contact, /contact-us
- /about, /about-us
- /press, /media, /newsroom
- /security, /trust
- /privacy, /legal
- /support, /help

## Testing

```bash
python -m pytest test_extraction.py -v
```

## API (Optional)

For programmatic access, you can also run the FastAPI backend:

```bash
uvicorn api:app --reload --port 8000
```

See `/docs` for API documentation.

## Database

SQLite database (`company_discovery.db`) with tables:
- `runs` - Discovery run history
- `companies` - Discovered companies
- `sources` - Fetched URLs
- `emails` - Extracted emails
- `settings` - Configuration

## Troubleshooting

**No companies found:**
- Check your API key is valid
- Try a different/broader keyword
- Check Perplexity API status

**No emails extracted:**
- Some companies may not have public emails
- Check the Sources in Results page
- Some pages may be blocked by robots.txt

**Rate limiting errors:**
- Increase delay in Settings page
- Wait and retry

## License

For educational and internal use only. Respect website terms of service.
