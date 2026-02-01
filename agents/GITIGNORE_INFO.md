# Git Ignore Configuration

Three `.gitignore` files protect sensitive and generated data:

## 1. `/agents/.gitignore` (Main)

Protects:
- `venv/` - Virtual environment
- `.streamlit/secrets.toml` - API keys
- `*.db` - Database files
- `discovered_companies.csv` - Company data
- `discovered_emails.csv` - Email data
- `__pycache__/` - Python cache
- `.DS_Store` - OS files

## 2. `/agents/company_discovery/.gitignore`

Protects:
- `.streamlit/secrets.toml`
- `*.db`
- `discovered_companies.csv`
- `__pycache__/`
- `venv/`

## 3. `/agents/email_research/.gitignore`

Protects:
- `*.db`
- `*.csv` (all CSV outputs)
- `.streamlit/secrets.toml`
- `__pycache__/`

## What Gets Committed

Safe to commit:
- `*.py` - Python code
- `*.md` - Documentation
- `requirements.txt` - Dependencies
- `pages/` - Streamlit pages
- `.gitignore` files themselves

## What's Protected

Never committed:
- API keys
- Database files
- CSV outputs with company/email data
- Virtual environments
- Python cache files

## Verify Before Commit

```bash
git status
```

Should NOT see:
- `secrets.toml`
- `*.db` files
- `*.csv` files
- `venv/` directory

## Current API Keys Location

```
agents/.streamlit/secrets.toml  # Shared by both apps
```

This file contains:
- `PPLX_API_KEY` - Perplexity AI
- `HUNTER_API_KEY` - Hunter.io (optional)

**This file is ignored by git and will never be committed.**
