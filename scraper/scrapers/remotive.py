import httpx
import logging
from typing import List, Optional
from datetime import datetime

from .base import BaseScraper
from models import ScrapedJob, JobCategory
from config import MAX_JOBS_PER_SOURCE, TECH_SKILLS

logger = logging.getLogger(__name__)

# Non-US location patterns to filter out
NON_US_LOCATION_PATTERNS = [
    'germany', 'deutschland', 'berlin,', 'munich,', 'hamburg,', 'frankfurt,', 'cologne,', 'düsseldorf',
    'united kingdom', ', uk', 'london,', 'manchester,', 'england',
    'canada', 'toronto,', 'vancouver,', 'montreal,', 'ontario,', 'british columbia',
    'india', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'chennai', 'pune',
    'australia', 'sydney,', 'melbourne,', 'brisbane,',
    'france', 'paris,', 'lyon,',
    'netherlands', 'amsterdam,', 'rotterdam,',
    'spain', 'madrid,', 'barcelona,',
    'italy', 'milan,', 'rome,',
    'poland', 'warsaw,', 'krakow,',
    'ireland', 'dublin,',
    'sweden', 'stockholm,',
    'switzerland', 'zurich,', 'geneva,',
    'austria', 'vienna,',
    'belgium', 'brussels,',
    'portugal', 'lisbon,',
    'singapore', 'japan', 'tokyo,', 'china', 'shanghai,', 'beijing,',
    'brazil', 'são paulo', 'sao paulo', 'mexico city', 'philippines', 'manila,',
    'israel', 'tel aviv',
    'europe only', 'emea only', 'apac only', 'latam only',
]


class RemotiveScraper(BaseScraper):
    """Scraper for Remotive.com API"""

    def __init__(self):
        super().__init__("remotive")
        self.api_url = "https://remotive.com/api/remote-jobs"

    async def fetch_jobs(self) -> List[ScrapedJob]:
        """Fetch remote jobs from Remotive API"""
        jobs: List[ScrapedJob] = []

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.api_url,
                    timeout=30.0,
                    headers={"Accept": "application/json"}
                )
                response.raise_for_status()
                data = response.json()

            raw_jobs = data.get("jobs", [])[:MAX_JOBS_PER_SOURCE]

            for raw_job in raw_jobs:
                try:
                    job = self._parse_job(raw_job)
                    if job:
                        # STRICT US-ONLY FILTER: Skip non-US jobs based on location text
                        # Allow "Remote" and "Worldwide" as they may include US
                        location_lower = (job.location or "").lower()
                        is_non_us = any(pattern in location_lower for pattern in NON_US_LOCATION_PATTERNS)
                        if is_non_us:
                            logger.debug(f"Skipping non-US job: {job.title} in {job.location}")
                            continue
                        jobs.append(job)
                except Exception as e:
                    logger.warning(f"Failed to parse job: {e}")
                    continue

        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching from Remotive: {e}")
            raise
        except Exception as e:
            logger.error(f"Error fetching from Remotive: {e}")
            raise

        return jobs

    def _parse_job(self, raw_job: dict) -> Optional[ScrapedJob]:
        """Parse a raw job from Remotive API"""
        job_id = raw_job.get("id")
        if not job_id:
            return None

        title = raw_job.get("title", "").strip()
        if not title:
            return None

        company_name = raw_job.get("company_name", "").strip()
        if not company_name:
            return None

        description = raw_job.get("description", "")

        # Extract location info
        candidate_location = raw_job.get("candidate_required_location", "")
        location = candidate_location if candidate_location else "Remote"

        # Determine job type
        job_type_raw = raw_job.get("job_type", "")
        job_type = self._map_job_type(job_type_raw)

        # Extract skills from description
        skills = self.extract_skills(description + " " + title, TECH_SKILLS)

        # Parse posted date
        posted_at = None
        pub_date = raw_job.get("publication_date")
        if pub_date:
            try:
                posted_at = datetime.fromisoformat(pub_date.replace("Z", "+00:00"))
            except ValueError:
                pass

        # Parse salary if available
        salary = raw_job.get("salary", "")
        salary_min, salary_max = self.parse_salary(salary)

        # Determine experience level from title and description
        experience_level = self.determine_experience_level(title + " " + description)

        return ScrapedJob(
            external_id=f"remotive_{job_id}",
            source="remotive",
            title=title,
            company_name=company_name,
            company_logo=raw_job.get("company_logo"),
            location=location,
            job_type=job_type,
            experience_level=experience_level,
            category=JobCategory.TECH,  # Remotive is primarily tech jobs
            description=description,
            salary_min=salary_min,
            salary_max=salary_max,
            skills=skills,
            remote=True,  # Remotive is all remote jobs
            apply_url=raw_job.get("url", ""),
            posted_at=posted_at,
        )

    def _map_job_type(self, job_type: str) -> Optional[str]:
        """Map Remotive job type to our job type"""
        mapping = {
            "full_time": "Full-time",
            "part_time": "Part-time",
            "contract": "Contract",
            "freelance": "Freelance",
            "internship": "Internship",
            "other": "Full-time",
        }
        return mapping.get(job_type.lower(), "Full-time")
