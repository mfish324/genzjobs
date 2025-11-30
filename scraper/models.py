from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class JobType(str, Enum):
    FULL_TIME = "Full-time"
    PART_TIME = "Part-time"
    CONTRACT = "Contract"
    INTERNSHIP = "Internship"
    FREELANCE = "Freelance"
    TEMPORARY = "Temporary"


class ExperienceLevel(str, Enum):
    ENTRY = "Entry Level"
    MID = "Mid Level"
    SENIOR = "Senior Level"
    LEAD = "Lead"
    MANAGER = "Manager"


class ScrapedJob(BaseModel):
    """Model for a scraped job listing"""
    external_id: str
    source: str
    title: str
    company_name: str
    company_logo: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[JobType] = None
    experience_level: Optional[ExperienceLevel] = None
    description: str
    requirements: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = "USD"
    skills: List[str] = Field(default_factory=list)
    remote: bool = False
    apply_url: str
    posted_at: Optional[datetime] = None
    scraped_at: datetime = Field(default_factory=datetime.utcnow)


class ScrapeResult(BaseModel):
    """Result of a scrape operation"""
    source: str
    jobs_found: int
    jobs_added: int
    jobs_updated: int
    errors: List[str] = Field(default_factory=list)
    duration_seconds: float


class ScraperStatus(BaseModel):
    """Current status of the scraper"""
    is_running: bool
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    total_jobs: int
    sources: List[str]


class HealthCheck(BaseModel):
    """Health check response"""
    status: str
    version: str = "1.0.0"
    database_connected: bool
    scheduler_running: bool
