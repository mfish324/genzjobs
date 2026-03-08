import httpx
import logging
from typing import List, Optional

from .ats_base import ATSBaseScraper
from models import ScrapedJob
from companies import SMARTRECRUITERS_COMPANIES

logger = logging.getLogger(__name__)

PAGE_SIZE = 100


class SmartRecruitersScraper(ATSBaseScraper):
    """Scraper for SmartRecruiters ATS boards.
    API: GET https://api.smartrecruiters.com/v1/companies/{slug}/postings?limit=100&offset=N
    Paginated. Has native experienceLevel and location.remote fields.
    """

    def __init__(self):
        super().__init__("smartrecruiters", SMARTRECRUITERS_COMPANIES)

    async def fetch_company_jobs(self, company_name: str, slug: str) -> List[ScrapedJob]:
        jobs: List[ScrapedJob] = []
        offset = 0

        async with httpx.AsyncClient() as client:
            while True:
                url = f"https://api.smartrecruiters.com/v1/companies/{slug}/postings"
                params = {"limit": PAGE_SIZE, "offset": offset}

                response = await client.get(url, params=params, timeout=30.0)
                response.raise_for_status()
                data = response.json()

                content = data.get("content", [])
                if not content:
                    break

                for raw_job in content:
                    job = self._parse_job(raw_job, company_name, slug)
                    if job:
                        jobs.append(job)

                total = data.get("totalFound", 0)
                offset += PAGE_SIZE
                if offset >= total:
                    break

                await self.rate_limit()

        return jobs

    def _parse_job(self, raw_job: dict, company_name: str, slug: str) -> Optional[ScrapedJob]:
        job_id = raw_job.get("id") or raw_job.get("uuid")
        title = raw_job.get("name", "").strip()
        if not job_id or not title:
            return None

        # Description from releasedDate or customField; SR postings API
        # provides limited description in the listing endpoint
        description = raw_job.get("jobAd", {}).get("sections", {}).get("jobDescription", {}).get("text", "")
        if not description:
            description = raw_job.get("description", "")
        description = self.strip_html(description) if "<" in description else description

        # Location
        location_data = raw_job.get("location", {})
        city = location_data.get("city", "")
        region = location_data.get("region", "")
        country = location_data.get("country", "")
        location_parts = [p for p in [city, region, country] if p]
        location = ", ".join(location_parts)

        # Remote from location.remote field
        remote = location_data.get("remote", False) or self.detect_remote(description, location)

        # Experience level (native field)
        experience = raw_job.get("experienceLevel", {})
        exp_label = experience.get("name", "") if isinstance(experience, dict) else ""

        # Job type from typeOfEmployment
        type_of_employment = raw_job.get("typeOfEmployment", {})
        type_label = type_of_employment.get("name", "") if isinstance(type_of_employment, dict) else ""
        job_type = self.normalize_job_type(type_label)

        # Apply URL
        apply_url = raw_job.get("ref", "") or raw_job.get("applyUrl", "")
        if not apply_url:
            apply_url = f"https://jobs.smartrecruiters.com/{company_name.replace(' ', '')}/{job_id}"

        return self.make_job(
            external_id=f"{slug}_{job_id}",
            title=title,
            company_name=company_name,
            description=description,
            apply_url=apply_url,
            location=location,
            remote=remote,
            job_type=job_type,
        )
