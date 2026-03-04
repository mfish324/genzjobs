import httpx
import logging
from typing import List, Optional
from datetime import datetime

from .ats_base import ATSBaseScraper
from models import ScrapedJob
from companies import WORKABLE_COMPANIES

logger = logging.getLogger(__name__)


class WorkableScraper(ATSBaseScraper):
    """Scraper for Workable ATS boards.
    API: GET https://apply.workable.com/api/v1/widget/accounts/{slug}?details=true
    Single request returns all jobs with descriptions.
    """

    def __init__(self):
        super().__init__("workable", WORKABLE_COMPANIES)

    async def fetch_company_jobs(self, company_name: str, slug: str) -> List[ScrapedJob]:
        jobs: List[ScrapedJob] = []
        url = f"https://apply.workable.com/api/v1/widget/accounts/{slug}?details=true"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()
            data = response.json()

        for raw_job in data.get("jobs", []):
            job = self._parse_job(raw_job, company_name, slug)
            if job:
                jobs.append(job)

        return jobs

    def _parse_job(self, raw_job: dict, company_name: str, slug: str) -> Optional[ScrapedJob]:
        job_id = raw_job.get("shortcode") or raw_job.get("id")
        title = raw_job.get("title", "").strip()
        if not job_id or not title:
            return None

        # Description (HTML)
        description = self.strip_html(raw_job.get("description", ""))

        # Append requirements if present
        requirements = raw_job.get("requirements", "")
        if requirements:
            description += "\n\nRequirements:\n" + self.strip_html(requirements)

        benefits = raw_job.get("benefits", "")
        if benefits:
            description += "\n\nBenefits:\n" + self.strip_html(benefits)

        # Location
        city = raw_job.get("city", "")
        state = raw_job.get("state", "")
        country = raw_job.get("country", "")
        location_parts = [p for p in [city, state, country] if p]
        location = ", ".join(location_parts)

        # Remote: telecommuting field
        remote = raw_job.get("telecommuting", False) or self.detect_remote(description, location)

        # Job type
        employment_type = raw_job.get("employment_type", "")
        job_type = self.normalize_job_type(employment_type)

        # Apply URL
        shortcode = raw_job.get("shortcode", job_id)
        apply_url = raw_job.get("url", f"https://apply.workable.com/{slug}/j/{shortcode}/")

        # Posted date
        posted_at = None
        published = raw_job.get("published_on") or raw_job.get("created_at")
        if published:
            try:
                posted_at = datetime.fromisoformat(str(published).replace("Z", "+00:00"))
            except (ValueError, TypeError):
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
            posted_at=posted_at,
        )
