import httpx
import logging
from typing import List, Optional
from datetime import datetime

from .ats_base import ATSBaseScraper
from models import ScrapedJob
from companies import GREENHOUSE_COMPANIES

logger = logging.getLogger(__name__)


class GreenhouseScraper(ATSBaseScraper):
    """Scraper for Greenhouse ATS boards.
    API: GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
    Returns all jobs in a single request (no pagination needed).
    """

    def __init__(self):
        super().__init__("greenhouse", GREENHOUSE_COMPANIES)

    async def fetch_company_jobs(self, company_name: str, slug: str) -> List[ScrapedJob]:
        jobs: List[ScrapedJob] = []
        url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true"

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
        job_id = raw_job.get("id")
        title = raw_job.get("title", "").strip()
        if not job_id or not title:
            return None

        # Description comes as HTML in content field
        description = self.strip_html(raw_job.get("content", ""))

        # Location
        location_data = raw_job.get("location", {})
        location = location_data.get("name", "") if isinstance(location_data, dict) else ""

        # Remote detection
        remote = self.detect_remote(description, location)

        # Apply URL
        apply_url = raw_job.get("absolute_url", f"https://boards.greenhouse.io/{slug}/jobs/{job_id}")

        # Posted date
        posted_at = None
        updated_str = raw_job.get("updated_at")
        if updated_str:
            try:
                posted_at = datetime.fromisoformat(updated_str.replace("Z", "+00:00"))
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
            posted_at=posted_at,
        )
