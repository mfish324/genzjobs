import httpx
import logging
from typing import List, Optional
from datetime import datetime

from .base import BaseScraper
from models import ScrapedJob
from config import MAX_JOBS_PER_SOURCE, TECH_SKILLS, RAPIDAPI_KEY

logger = logging.getLogger(__name__)


class JSearchScraper(BaseScraper):
    """Scraper for JSearch API via RapidAPI - Google Jobs aggregator"""

    def __init__(self):
        super().__init__("jsearch")
        self.api_url = "https://jsearch.p.rapidapi.com/search"
        self.headers = {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        }

    async def fetch_jobs(self) -> List[ScrapedJob]:
        """Fetch jobs from JSearch API"""
        jobs: List[ScrapedJob] = []

        if not RAPIDAPI_KEY:
            logger.warning("RAPIDAPI_KEY not set, skipping JSearch scraper")
            return jobs

        # Search queries targeting Gen-Z relevant jobs
        search_queries = [
            "entry level software developer",
            "junior developer",
            "software engineer intern",
            "junior data analyst",
            "entry level web developer",
        ]

        try:
            async with httpx.AsyncClient() as client:
                for query in search_queries:
                    if len(jobs) >= MAX_JOBS_PER_SOURCE:
                        break

                    await self.rate_limit()

                    params = {
                        "query": query,
                        "page": "1",
                        "num_pages": "1",
                        "date_posted": "week",  # Jobs from last week
                    }

                    response = await client.get(
                        self.api_url,
                        headers=self.headers,
                        params=params,
                        timeout=30.0,
                    )

                    if response.status_code == 429:
                        logger.warning("JSearch API rate limit reached")
                        break

                    response.raise_for_status()
                    data = response.json()

                    raw_jobs = data.get("data", [])
                    logger.info(f"JSearch query '{query}' returned {len(raw_jobs)} jobs")

                    for raw_job in raw_jobs:
                        if len(jobs) >= MAX_JOBS_PER_SOURCE:
                            break

                        try:
                            job = self._parse_job(raw_job)
                            if job and not self._job_exists(jobs, job):
                                jobs.append(job)
                        except Exception as e:
                            logger.warning(f"Failed to parse JSearch job: {e}")
                            continue

        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching from JSearch: {e}")
            raise
        except Exception as e:
            logger.error(f"Error fetching from JSearch: {e}")
            raise

        return jobs

    def _job_exists(self, jobs: List[ScrapedJob], new_job: ScrapedJob) -> bool:
        """Check if job already exists in list (by external_id)"""
        return any(job.external_id == new_job.external_id for job in jobs)

    def _parse_job(self, raw_job: dict) -> Optional[ScrapedJob]:
        """Parse a raw job from JSearch API"""
        job_id = raw_job.get("job_id")
        if not job_id:
            return None

        title = raw_job.get("job_title", "").strip()
        if not title:
            return None

        company_name = raw_job.get("employer_name", "").strip()
        if not company_name:
            return None

        description = raw_job.get("job_description", "")

        # Extract location
        city = raw_job.get("job_city", "")
        state = raw_job.get("job_state", "")
        country = raw_job.get("job_country", "")
        location_parts = [p for p in [city, state, country] if p]
        location = ", ".join(location_parts) if location_parts else "Unknown"

        # Check if remote
        is_remote = raw_job.get("job_is_remote", False)
        if is_remote:
            location = "Remote" if not location_parts else f"{location} (Remote)"

        # Job type
        employment_type = raw_job.get("job_employment_type", "")
        job_type = self._map_job_type(employment_type)

        # Extract skills from description
        skills = self.extract_skills(description + " " + title, TECH_SKILLS)

        # Parse posted date
        posted_at = None
        posted_timestamp = raw_job.get("job_posted_at_timestamp")
        if posted_timestamp:
            try:
                posted_at = datetime.fromtimestamp(posted_timestamp)
            except (ValueError, TypeError):
                pass

        # Parse salary
        salary_min = raw_job.get("job_min_salary")
        salary_max = raw_job.get("job_max_salary")
        salary_currency = raw_job.get("job_salary_currency", "USD")
        salary_period = raw_job.get("job_salary_period", "YEAR")

        # Convert to yearly if hourly
        if salary_period and salary_period.upper() == "HOUR":
            if salary_min:
                salary_min = int(salary_min * 2080)  # 40 hrs/week * 52 weeks
            if salary_max:
                salary_max = int(salary_max * 2080)
            salary_period = "yearly"
        else:
            salary_period = "yearly"

        # Determine experience level
        experience_level = self.determine_experience_level(title + " " + description)
        if not experience_level:
            required_exp = raw_job.get("job_required_experience", {})
            if required_exp:
                exp_in_months = required_exp.get("required_experience_in_months", 0)
                if exp_in_months is not None:
                    if exp_in_months <= 12:
                        experience_level = "Entry Level"
                    elif exp_in_months <= 36:
                        experience_level = "Mid Level"
                    elif exp_in_months <= 72:
                        experience_level = "Senior Level"
                    else:
                        experience_level = "Lead"

        return ScrapedJob(
            external_id=f"jsearch_{job_id}",
            source="jsearch",
            title=title,
            company_name=company_name,
            company_logo=raw_job.get("employer_logo"),
            location=location,
            job_type=job_type,
            experience_level=experience_level,
            description=description,
            salary_min=int(salary_min) if salary_min else None,
            salary_max=int(salary_max) if salary_max else None,
            salary_currency=salary_currency,
            salary_period=salary_period,
            skills=skills,
            remote=is_remote,
            apply_url=raw_job.get("job_apply_link", ""),
            posted_at=posted_at,
        )

    def _map_job_type(self, employment_type: str) -> str:
        """Map JSearch employment type to our job type"""
        if not employment_type:
            return "Full-time"

        mapping = {
            "FULLTIME": "Full-time",
            "PARTTIME": "Part-time",
            "CONTRACTOR": "Contract",
            "INTERN": "Internship",
            "TEMPORARY": "Temporary",
        }
        return mapping.get(employment_type.upper(), "Full-time")
