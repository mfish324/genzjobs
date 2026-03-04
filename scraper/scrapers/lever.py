import httpx
import logging
from typing import List, Optional
from datetime import datetime

from .ats_base import ATSBaseScraper
from models import ScrapedJob
from companies import LEVER_COMPANIES

logger = logging.getLogger(__name__)


class LeverScraper(ATSBaseScraper):
    """Scraper for Lever ATS boards.
    API: GET https://api.lever.co/v0/postings/{slug}?mode=json
    Returns flat array of jobs. Has native salaryRange field.
    """

    def __init__(self):
        super().__init__("lever", LEVER_COMPANIES)

    async def fetch_company_jobs(self, company_name: str, slug: str) -> List[ScrapedJob]:
        jobs: List[ScrapedJob] = []
        url = f"https://api.lever.co/v0/postings/{slug}?mode=json"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()
            data = response.json()

        # Lever returns a flat array
        if not isinstance(data, list):
            return []

        for raw_job in data:
            job = self._parse_job(raw_job, company_name)
            if job:
                jobs.append(job)

        return jobs

    def _parse_job(self, raw_job: dict, company_name: str) -> Optional[ScrapedJob]:
        job_id = raw_job.get("id")
        title = raw_job.get("text", "").strip()
        if not job_id or not title:
            return None

        # Description: Lever has descriptionPlain or description (HTML)
        description = raw_job.get("descriptionPlain", "")
        if not description:
            description = self.strip_html(raw_job.get("description", ""))

        # Append additional lists (requirements, etc.)
        for lst in raw_job.get("lists", []):
            list_text = lst.get("text", "")
            list_content = self.strip_html(lst.get("content", ""))
            if list_text or list_content:
                description += f"\n\n{list_text}\n{list_content}"

        # Location
        categories = raw_job.get("categories", {})
        location = categories.get("location", "")
        commitment = categories.get("commitment", "")
        team = categories.get("team", "")

        # Remote detection
        remote = self.detect_remote(f"{description} {location} {commitment}", location)

        # Job type from commitment field
        job_type = self.normalize_job_type(commitment)

        # Salary
        salary_min = None
        salary_max = None
        salary_currency = "USD"
        salary_range = raw_job.get("salaryRange")
        if salary_range:
            salary_min = salary_range.get("min")
            salary_max = salary_range.get("max")
            salary_currency = salary_range.get("currency", "USD")

        # Apply URL
        apply_url = raw_job.get("hostedUrl", raw_job.get("applyUrl", ""))

        # Posted date
        posted_at = None
        created_at = raw_job.get("createdAt")
        if created_at:
            try:
                posted_at = datetime.fromtimestamp(created_at / 1000)
            except (ValueError, TypeError, OSError):
                pass

        return self.make_job(
            external_id=str(job_id),
            title=title,
            company_name=company_name,
            description=description,
            apply_url=apply_url,
            location=location,
            remote=remote,
            job_type=job_type,
            salary_min=salary_min,
            salary_max=salary_max,
            salary_currency=salary_currency,
            posted_at=posted_at,
        )
