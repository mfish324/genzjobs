import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from parent directory (project root) for local development
# In production (Railway), env vars are set directly
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/genzjobs")

# Scraper settings
SCRAPE_INTERVAL_MINUTES = int(os.getenv("SCRAPE_INTERVAL_MINUTES", "60"))
MAX_JOBS_PER_SOURCE = int(os.getenv("MAX_JOBS_PER_SOURCE", "2000"))
REQUEST_DELAY_SECONDS = float(os.getenv("REQUEST_DELAY_SECONDS", "0.25"))  # 4 req/sec (under 5/sec limit)

# API settings
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
API_KEY = os.getenv("SCRAPER_API_KEY", "")

# External API keys
JSEARCH_API_KEY = os.getenv("JSEARCH_API_KEY", "")
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
        "enabled": bool(JSEARCH_API_KEY),
        "url": "https://api.openwebninja.com/jsearch/search",
        "type": "api",
    },
    "usajobs": {
        "enabled": bool(USAJOBS_API_KEY and USAJOBS_EMAIL),
        "url": "https://data.usajobs.gov/api/search",
        "type": "api",
    },
    "apprenticeship": {
        "enabled": True,
        "url": "https://www.apprenticeship.gov/api/v1/apprenticeships",
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

TRADES_SKILLS = [
    "electrical", "plumbing", "hvac", "welding", "carpentry", "construction",
    "masonry", "pipefitting", "sheet metal", "machining", "cnc", "automotive",
    "diesel", "electrician", "mechanical", "blueprint", "safety", "osha",
    "maintenance", "repair", "installation", "wiring", "soldering", "fabrication",
    "forklift", "heavy equipment", "roofing", "drywall", "painting",
]

PUBLIC_SAFETY_SKILLS = [
    "emergency response", "first aid", "cpr", "emt", "paramedic", "firefighting",
    "law enforcement", "crisis management", "dispatch", "investigation",
    "security", "patrol", "surveillance", "report writing", "firearms",
    "defensive tactics", "de-escalation", "public safety", "emergency management",
]

HEALTHCARE_SKILLS = [
    "patient care", "nursing", "medical terminology", "phlebotomy", "vital signs",
    "hipaa", "ekg", "ecg", "medical billing", "cna", "lpn", "rn", "bls",
    "medication administration", "wound care", "infection control",
]
