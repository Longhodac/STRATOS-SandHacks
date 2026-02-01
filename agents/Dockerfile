FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMEDRIVER_PATH=/usr/bin/chromedriver

WORKDIR /app
COPY email_research/ ./email_research/
COPY company_discovery/ ./company_discovery/

RUN pip install --no-cache-dir -r email_research/requirements.txt

WORKDIR /app/email_research
ENV PYTHONPATH=/app/email_research:/app/company_discovery

EXPOSE 8000

CMD ["sh", "-c", "exec uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}"]
