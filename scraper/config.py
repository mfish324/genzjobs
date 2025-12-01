import os
from dotenv import load_dotenv

load_dotenv()

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/genzjobs")

# Scraper settings
SCRAPE_INTERVAL_MINUTES = int(os.getenv("SCRAPE_INTERVAL_MINUTES", "60"))
MAX_JOBS_PER_SOURCE = int(os.getenv("MAX_JOBS_PER_SOURCE", "50"))
REQUEST_DELAY_SECONDS = float(os.getenv("REQUEST_DELAY_SECONDS", "2.0"))

# API settings
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
API_KEY = os.getenv("SCRAPER_API_KEY", "")

# External API keys
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "")
USAJOBS_API_KEY = os.getenv("USAJOBS_API_KEY", "")
USAJOBS_EMAIL = os.getenv("USAJOBS_EMAIL", "")

# Job sources configuration
JOB_SOURCES = {
    "remotive": {
        "enabled": True,
        "url": "https://remotive.com/api/remote-jobs",
        "type": "api",
    },
    "arbeitnow": {
        "enabled": True,
        "url": "https://www.arbeitnow.com/api/job-board-api",
        "type": "api",
    },
    "jsearch": {
        "enabled": bool(RAPIDAPI_KEY),
        "url": "https://jsearch.p.rapidapi.com/search",
        "type": "api",
    },
    "usajobs": {
        "enabled": bool(USAJOBS_API_KEY and USAJOBS_EMAIL),
        "url": "https://data.usajobs.gov/api/search",
        "type": "api",
    },
}

# Keywords to filter for Gen-Z relevant jobs
GENZ_KEYWORDS = [
    "entry level",
    "junior",
    "graduate",
    "intern",
    "associate",
    "trainee",
    "early career",
    "new grad",
    "0-2 years",
    "1-3 years",
    "no experience required",
]

# Skills to look for
TECH_SKILLS = [
    "python", "javascript", "typescript", "react", "node.js", "java",
    "sql", "aws", "docker", "git", "html", "css", "vue", "angular",
    "go", "rust", "swift", "kotlin", "flutter", "django", "fastapi",
    "mongodb", "postgresql", "redis", "kubernetes", "terraform",
]
