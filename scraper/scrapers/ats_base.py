import logging
import re
from abc import abstractmethod
from typing import List, Optional, Tuple

import httpx
from bs4 import BeautifulSoup

from .base import BaseScraper
from models import ScrapedJob, JobCategory
from config import MAX_JOBS_PER_SOURCE, TECH_SKILLS

logger = logging.getLogger(__name__)


class ATSBaseScraper(BaseScraper):
    """Base class for ATS scrapers that iterate over multiple company boards."""

    def __init__(self, source_name: str, companies: List[Tuple[str, str]]):
        super().__init__(source_name)
        self.companies = companies

    async def fetch_jobs(self) -> List[ScrapedJob]:
        all_jobs: List[ScrapedJob] = []

        for company_name, slug in self.companies:
            if len(all_jobs) >= MAX_JOBS_PER_SOURCE:
                logger.info(f"[{self.source_name}] Hit max jobs limit ({MAX_JOBS_PER_SOURCE}), stopping")
                break

            try:
                jobs = await self.fetch_company_jobs(company_name, slug)
                all_jobs.extend(jobs)
                logger.info(f"[{self.source_name}] {company_name}: {len(jobs)} jobs")
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    logger.warning(f"[{self.source_name}] {company_name} ({slug}): board not found (404)")
                else:
                    logger.error(f"[{self.source_name}] {company_name} ({slug}): HTTP {e.response.status_code}")
            except Exception as e:
                logger.error(f"[{self.source_name}] {company_name} ({slug}): {e}")

            await self.rate_limit()

        return all_jobs

    @abstractmethod
    async def fetch_company_jobs(self, company_name: str, slug: str) -> List[ScrapedJob]:
        """Fetch jobs for a single company. Must be implemented by subclasses."""
        pass

    @staticmethod
    def strip_html(html: Optional[str]) -> str:
        """Strip HTML tags and return plain text."""
        if not html:
            return ""
        soup = BeautifulSoup(html, "lxml")
        return soup.get_text(separator="\n", strip=True)

    @staticmethod
    def detect_remote(text: str, location: Optional[str] = None) -> bool:
        """Detect if a job is remote from text and location fields."""
        check = f"{text} {location or ''}".lower()
        return bool(re.search(r'\bremote\b', check))

    @staticmethod
    def normalize_job_type(raw: Optional[str]) -> Optional[str]:
        """Normalize job type strings to standard values."""
        if not raw:
            return None
        raw_lower = raw.lower().replace("_", "-").replace(" ", "-")
        mapping = {
            "full-time": "Full-time",
            "fulltime": "Full-time",
            "part-time": "Part-time",
            "parttime": "Part-time",
            "contract": "Contract",
            "contractor": "Contract",
            "intern": "Internship",
            "internship": "Internship",
            "freelance": "Freelance",
            "temporary": "Temporary",
            "temp": "Temporary",
        }
        for key, val in mapping.items():
            if key in raw_lower:
                return val
        return "Full-time"

    def make_job(
        self,
        external_id: str,
        title: str,
        company_name: str,
        description: str,
        apply_url: str,
        location: Optional[str] = None,
        remote: bool = False,
        job_type: Optional[str] = None,
        salary_min: Optional[int] = None,
        salary_max: Optional[int] = None,
        salary_currency: Optional[str] = "USD",
        company_logo: Optional[str] = None,
        posted_at=None,
    ) -> Optional[ScrapedJob]:
        """Create a ScrapedJob with standard fields. Returns None if missing required data."""
        if not title or not title.strip():
            return None
        if not apply_url:
            return None

        skills = self.extract_skills(f"{title} {description}", TECH_SKILLS)

        return ScrapedJob(
            external_id=f"{self.source_name}_{external_id}",
            source=self.source_name,
            title=title.strip(),
            company_name=company_name,
            company_logo=company_logo,
            location=location,
            job_type=job_type or self.determine_job_type(f"{title} {description}"),
            experience_level=self.determine_experience_level(f"{title} {description}"),
            category=JobCategory.TECH,
            description=description,
            salary_min=salary_min,
            salary_max=salary_max,
            salary_currency=salary_currency,
            skills=skills,
            remote=remote,
            country="US",
            apply_url=apply_url,
            posted_at=posted_at,
        )
