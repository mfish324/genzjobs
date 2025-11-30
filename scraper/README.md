# GenZJobs Job Scraper Service

A Python FastAPI service that scrapes job listings from various sources and stores them in the GenZJobs database.

## Features

- Scheduled job scraping from multiple sources (Remotive, Arbeitnow)
- REST API for manual scrape triggers and monitoring
- Automatic skill extraction from job descriptions
- Experience level detection
- Duplicate handling (update existing jobs)
- Old job cleanup

## Setup

### 1. Create virtual environment

```bash
cd scraper
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Run the service

```bash
python main.py
```

Or with uvicorn directly:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/status` | GET | Scraper status |
| `/scrape` | POST | Trigger scrape of all sources |
| `/scrape/{source}` | POST | Trigger scrape of single source |
| `/sources` | GET | List available sources |
| `/results` | GET | Get last scrape results |
| `/cleanup?days=30` | POST | Remove old jobs |

## API Authentication

If `SCRAPER_API_KEY` is set in environment, all endpoints (except `/health`) require the `X-API-Key` header.

## Docker

```bash
docker build -t genzjobs-scraper .
docker run -p 8000:8000 --env-file .env genzjobs-scraper
```

## Adding New Scrapers

1. Create a new file in `scrapers/` directory
2. Extend `BaseScraper` class
3. Implement `fetch_jobs()` method
4. Add configuration to `config.py`
5. Register in `scheduler.py`

Example:

```python
from scrapers.base import BaseScraper
from models import ScrapedJob

class MyScraper(BaseScraper):
    def __init__(self):
        super().__init__("my_source")
        self.api_url = "https://api.example.com/jobs"

    async def fetch_jobs(self) -> List[ScrapedJob]:
        # Implement job fetching logic
        pass
```
