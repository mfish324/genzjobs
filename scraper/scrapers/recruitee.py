import httpx
import logging
from typing import List, Optional
from datetime import datetime

from .ats_base import ATSBaseScraper
from models import ScrapedJob
from companies import RECRUITEE_COMPANIES

logger = logging.getLogger(__name__)


class RecruiteeScraper(ATSBaseScraper):
    """Scraper for Recruitee ATS boards.
    API: GET https://{slug}.recruitee.com/api/offers
    Returns {offers: [...]}. Has structured salary and experience level fields.
    """

    def __init__(self):
        super().__init__("recruitee", RECRUITEE_COMPANIES)

    async def fetch_company_jobs(self, company_name: str, slug: str) -> List[ScrapedJob]:
        jobs: List[ScrapedJob] = []
        url = f"https://{slug}.recruitee.com/api/offers"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()
            data = response.json()

        for raw_job in data.get("offers", []):
            job = self._parse_job(raw_job, company_name, slug)
            if job:
                jobs.append(job)

        return jobs

    def _parse_job(self, raw_job: dict, company_name: str, slug: str) -> Optional[ScrapedJob]:
        job_id = raw_job.get("id")
        title = raw_job.get("title", "").strip()
        if not job_id or not title:
            return None

        # Status check - only published offers
        status = raw_job.get("status", "")
        if status and status != "published":
            return None

        # Description: try translations.en first, then description
        description = ""
        translations = raw_job.get("translations", {})
        if translations and isinstance(translations, dict):
            en = translations.get("en", {})
            if isinstance(en, dict):
                description = en.get("description", "")
        if not description:
            description = raw_job.get("description", "")
        description = self.strip_html(description) if "<" in description else description

        # Location
        location = raw_job.get("location", "")
        city = raw_job.get("city", "")
        country = raw_job.get("country", "")
        if not location:
            location_parts = [p for p in [city, country] if p]
            location = ", ".join(location_parts)

        # Remote
        remote = raw_job.get("remote", False) or self.detect_remote(description, location)

        # Job type from employment_type_code
        job_type = self.normalize_job_type(raw_job.get("employment_type_code"))

        # Salary
        salary_min = raw_job.get("min_salary")
        salary_max = raw_job.get("max_salary")
        salary_currency = raw_job.get("salary_currency", "USD")

        # Convert to int if present
        if salary_min is not None:
            try:
                salary_min = int(salary_min)
            except (ValueError, TypeError):
                salary_min = None
        if salary_max is not None:
            try:
                salary_max = int(salary_max)
            except (ValueError, TypeError):
                salary_max = None

        # Apply URL
        careers_url = raw_job.get("careers_url") or raw_job.get("url")
        apply_url = careers_url or f"https://{slug}.recruitee.com/o/{raw_job.get('slug', job_id)}"

        # Posted date
        posted_at = None
        published = raw_job.get("published_at") or raw_job.get("created_at")
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
            salary_min=salary_min,
            salary_max=salary_max,
            salary_currency=salary_currency,
            posted_at=posted_at,
        )
