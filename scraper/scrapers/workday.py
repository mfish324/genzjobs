import httpx
import logging
from typing import List, Optional
from datetime import datetime

from .ats_base import ATSBaseScraper
from models import ScrapedJob
from companies import WORKDAY_COMPANIES
from config import MAX_JOBS_PER_SOURCE

logger = logging.getLogger(__name__)

PAGE_SIZE = 20  # Workday default and max per request


class WorkdayScraper(ATSBaseScraper):
    """Scraper for Workday ATS boards.
    API: POST https://{tenant}.{server}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
    Slug format: tenant.server.site (e.g., "salesforce.wd12.External_Career_Site")
    Pagination via offset/limit in POST body. Per-job detail fetches for full descriptions.
    """

    def __init__(self):
        super().__init__("workday", WORKDAY_COMPANIES)

    def _parse_slug(self, slug: str):
        """Parse tenant.server.site slug into components."""
        parts = slug.split(".")
        if len(parts) != 3:
            raise ValueError(f"Invalid Workday slug format: {slug} (expected tenant.server.site)")
        return parts[0], parts[1], parts[2]

    def _base_url(self, tenant: str, server: str) -> str:
        return f"https://{tenant}.{server}.myworkdayjobs.com"

    async def fetch_company_jobs(self, company_name: str, slug: str) -> List[ScrapedJob]:
        tenant, server, site = self._parse_slug(slug)
        base_url = self._base_url(tenant, server)
        jobs_url = f"{base_url}/wday/cxs/{tenant}/{site}/jobs"

        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

        jobs: List[ScrapedJob] = []
        offset = 0
        max_per_company = 500  # Cap per company to avoid overwhelming large employers

        async with httpx.AsyncClient() as client:
            while len(jobs) < max_per_company:
                payload = {
                    "appliedFacets": {},
                    "limit": PAGE_SIZE,
                    "offset": offset,
                    "searchText": "",
                }

                response = await client.post(jobs_url, json=payload, headers=headers, timeout=30.0)
                response.raise_for_status()
                data = response.json()

                job_postings = data.get("jobPostings", [])
                if not job_postings:
                    break

                total = data.get("total", 0)

                # Fetch details for each job (Workday listing endpoint has minimal info)
                for posting in job_postings:
                    if len(jobs) >= max_per_company:
                        break

                    job = await self._fetch_and_parse_job(
                        client, base_url, tenant, site, posting, company_name, headers
                    )
                    if job:
                        jobs.append(job)

                    await self.rate_limit()

                offset += PAGE_SIZE
                if offset >= total:
                    break

                await self.rate_limit()

        return jobs

    async def _fetch_and_parse_job(
        self,
        client: httpx.AsyncClient,
        base_url: str,
        tenant: str,
        site: str,
        posting: dict,
        company_name: str,
        headers: dict,
    ) -> Optional[ScrapedJob]:
        """Fetch job details and parse into ScrapedJob."""
        external_path = posting.get("externalPath", "")
        title = posting.get("title", "").strip()
        if not external_path or not title:
            return None

        # Build a stable ID from the path
        job_id = external_path.strip("/").split("/")[-1] if external_path else None
        if not job_id:
            return None

        # Fetch full job details
        detail_url = f"{base_url}/wday/cxs/{tenant}/{site}{external_path}"
        description = ""
        location = ""
        posted_at = None
        job_type_str = ""

        try:
            detail_resp = await client.get(detail_url, headers=headers, timeout=15.0)
            if detail_resp.status_code == 200:
                detail = detail_resp.json()
                job_detail = detail.get("jobPostingInfo", {})

                # Description
                description = self.strip_html(job_detail.get("jobDescription", ""))

                # Additional info
                additional = job_detail.get("additionalInformation", "")
                if additional:
                    description += "\n\n" + self.strip_html(additional)

                # Location
                location = job_detail.get("location", "")

                # Job type
                job_type_str = job_detail.get("timeType", "")

                # Posted date
                posted_str = job_detail.get("postedOn") or job_detail.get("startDate")
                if posted_str:
                    try:
                        posted_at = datetime.fromisoformat(posted_str.replace("Z", "+00:00"))
                    except (ValueError, TypeError):
                        pass
        except Exception as e:
            logger.debug(f"[workday] Failed to fetch details for {job_id}: {e}")
            # Use listing data as fallback
            location = posting.get("locationsText", "")

        # Fallback location from listing
        if not location:
            location = posting.get("locationsText", "")

        # Remote detection
        remote = self.detect_remote(f"{description} {title}", location)

        # Job type
        job_type = self.normalize_job_type(job_type_str)

        # Apply URL
        apply_url = posting.get("externalPath", "")
        if apply_url:
            apply_url = f"{base_url}{apply_url}"

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
