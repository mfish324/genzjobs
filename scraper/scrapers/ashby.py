import httpx
import logging
from typing import List, Optional
from datetime import datetime

from .ats_base import ATSBaseScraper
from models import ScrapedJob
from companies import ASHBY_COMPANIES

logger = logging.getLogger(__name__)


class AshbyScraper(ATSBaseScraper):
    """Scraper for Ashby ATS boards.
    API: GET https://api.ashbyhq.com/posting-api/job-board/{slug}
    Returns {jobs: [...]} with descriptionPlain, isRemote, compensation.
    """

    def __init__(self):
        super().__init__("ashby", ASHBY_COMPANIES)

    async def fetch_company_jobs(self, company_name: str, slug: str) -> List[ScrapedJob]:
        jobs: List[ScrapedJob] = []
        url = f"https://api.ashbyhq.com/posting-api/job-board/{slug}"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()
            data = response.json()

        for raw_job in data.get("jobs", []):
            # Skip unlisted jobs
            if raw_job.get("isListed") is False:
                continue

            job = self._parse_job(raw_job, company_name, slug)
            if job:
                jobs.append(job)

        return jobs

    def _parse_job(self, raw_job: dict, company_name: str, slug: str) -> Optional[ScrapedJob]:
        job_id = raw_job.get("id")
        title = raw_job.get("title", "").strip()
        if not job_id or not title:
            return None

        # Description: prefer plain text, fall back to HTML stripping
        description = raw_job.get("descriptionPlain", "")
        if not description:
            description = self.strip_html(raw_job.get("descriptionHtml", ""))

        # Location
        location = raw_job.get("location", "")
        if isinstance(location, dict):
            location = location.get("name", "")

        # Remote
        remote = raw_job.get("isRemote", False) or self.detect_remote(description, location)

        # Job type from employment type field
        job_type = self.normalize_job_type(raw_job.get("employmentType"))

        # Salary from compensation field
        salary_min = None
        salary_max = None
        salary_currency = "USD"
        compensation = raw_job.get("compensation")
        if compensation:
            comp_range = compensation.get("range")
            if comp_range:
                salary_min = comp_range.get("min")
                salary_max = comp_range.get("max")
            salary_currency = compensation.get("currency", "USD")

        # Apply URL
        apply_url = raw_job.get("jobUrl", f"https://jobs.ashbyhq.com/{slug}/{job_id}")

        # Posted date
        posted_at = None
        published = raw_job.get("publishedDate") or raw_job.get("createdAt")
        if published:
            try:
                posted_at = datetime.fromisoformat(str(published).replace("Z", "+00:00"))
            except (ValueError, TypeError):
                pass

        return self.make_job(
            external_id=f"{slug}_{job_id}",
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
