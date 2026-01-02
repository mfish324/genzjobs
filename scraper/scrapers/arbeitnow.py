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
]


class ArbeitnowScraper(BaseScraper):
    """Scraper for Arbeitnow.com API"""

    def __init__(self):
        super().__init__("arbeitnow")
        self.api_url = "https://www.arbeitnow.com/api/job-board-api"

    async def fetch_jobs(self) -> List[ScrapedJob]:
        """Fetch jobs from Arbeitnow API"""
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

            raw_jobs = data.get("data", [])[:MAX_JOBS_PER_SOURCE]

            for raw_job in raw_jobs:
                try:
                    job = self._parse_job(raw_job)
                    if job:
                        # STRICT US-ONLY FILTER: Skip non-US jobs based on location text
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
            logger.error(f"HTTP error fetching from Arbeitnow: {e}")
            raise
        except Exception as e:
            logger.error(f"Error fetching from Arbeitnow: {e}")
            raise

        return jobs

    def _parse_job(self, raw_job: dict) -> Optional[ScrapedJob]:
        """Parse a raw job from Arbeitnow API"""
        slug = raw_job.get("slug")
        if not slug:
            return None

        title = raw_job.get("title", "").strip()
        if not title:
            return None

        company_name = raw_job.get("company_name", "").strip()
        if not company_name:
            return None

        description = raw_job.get("description", "")

        # Extract location
        location = raw_job.get("location", "")
        remote = raw_job.get("remote", False)

        if remote and not location:
            location = "Remote"

        # Extract tags/skills
        tags = raw_job.get("tags", [])
        skills = [tag for tag in tags if tag.lower() in [s.lower() for s in TECH_SKILLS]]

        # Also extract from description
        desc_skills = self.extract_skills(description + " " + title, TECH_SKILLS)
        skills = list(set(skills + desc_skills))

        # Parse posted date
        posted_at = None
        created_at = raw_job.get("created_at")
        if created_at:
            try:
                # Handle Unix timestamp
                if isinstance(created_at, (int, float)):
                    posted_at = datetime.fromtimestamp(created_at)
                else:
                    posted_at = datetime.fromisoformat(str(created_at).replace("Z", "+00:00"))
            except (ValueError, OSError):
                pass

        # Determine experience level
        experience_level = self.determine_experience_level(title + " " + description)

        # Determine job type
        job_type = self.determine_job_type(title + " " + description)

        return ScrapedJob(
            external_id=f"arbeitnow_{slug}",
            source="arbeitnow",
            title=title,
            company_name=company_name,
            company_logo=raw_job.get("company_logo"),
            location=location,
            job_type=job_type,
            experience_level=experience_level,
            category=JobCategory.TECH,  # Arbeitnow is primarily tech jobs
            description=description,
            skills=skills,
            remote=remote,
            apply_url=raw_job.get("url", ""),
            posted_at=posted_at,
        )
