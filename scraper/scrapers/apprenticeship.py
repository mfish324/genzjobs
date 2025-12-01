import httpx
import logging
from typing import List, Optional
from datetime import datetime

from .base import BaseScraper
from models import ScrapedJob, JobCategory, JobType
from config import MAX_JOBS_PER_SOURCE

logger = logging.getLogger(__name__)


# Trades-related skills for extraction
TRADES_SKILLS = [
    "electrical", "plumbing", "hvac", "welding", "carpentry", "construction",
    "masonry", "pipefitting", "sheet metal", "machining", "cnc", "automotive",
    "diesel", "electrician", "mechanical", "blueprint", "safety", "osha",
    "maintenance", "repair", "installation", "wiring", "soldering", "fabrication",
]


class ApprenticeshipScraper(BaseScraper):
    """Scraper for Apprenticeship.gov API - DOL Registered Apprenticeships"""

    def __init__(self):
        super().__init__("apprenticeship")
        # Apprenticeship.gov provides a public API
        self.api_url = "https://www.apprenticeship.gov/api/v1/apprenticeships"

    async def fetch_jobs(self) -> List[ScrapedJob]:
        """Fetch apprenticeships from Apprenticeship.gov API"""
        jobs: List[ScrapedJob] = []

        # Search for various trades apprenticeships
        occupation_types = [
            "electrician",
            "plumber",
            "hvac",
            "carpenter",
            "welder",
            "machinist",
            "automotive",
            "construction",
            "sheet metal",
            "pipefitter",
        ]

        try:
            async with httpx.AsyncClient() as client:
                for occupation in occupation_types:
                    if len(jobs) >= MAX_JOBS_PER_SOURCE:
                        break

                    await self.rate_limit()

                    params = {
                        "keyword": occupation,
                        "page": 1,
                        "per_page": 25,
                    }

                    try:
                        response = await client.get(
                            self.api_url,
                            params=params,
                            timeout=30.0,
                        )

                        if response.status_code == 429:
                            logger.warning("Apprenticeship.gov API rate limit reached")
                            break

                        if response.status_code != 200:
                            logger.warning(f"Apprenticeship.gov returned {response.status_code} for {occupation}")
                            continue

                        data = response.json()
                        raw_jobs = data.get("data", []) if isinstance(data, dict) else data

                        logger.info(f"Apprenticeship.gov query '{occupation}' returned {len(raw_jobs)} results")

                        for raw_job in raw_jobs:
                            if len(jobs) >= MAX_JOBS_PER_SOURCE:
                                break

                            try:
                                job = self._parse_job(raw_job)
                                if job and not self._job_exists(jobs, job):
                                    jobs.append(job)
                            except Exception as e:
                                logger.warning(f"Failed to parse apprenticeship: {e}")
                                continue

                    except httpx.HTTPError as e:
                        logger.warning(f"HTTP error fetching apprenticeships for {occupation}: {e}")
                        continue

        except Exception as e:
            logger.error(f"Error fetching from Apprenticeship.gov: {e}")
            raise

        return jobs

    def _job_exists(self, jobs: List[ScrapedJob], new_job: ScrapedJob) -> bool:
        """Check if job already exists in list (by external_id)"""
        return any(job.external_id == new_job.external_id for job in jobs)

    def _parse_job(self, raw_job: dict) -> Optional[ScrapedJob]:
        """Parse a raw apprenticeship from API"""
        # Handle different possible API response formats
        job_id = raw_job.get("id") or raw_job.get("program_id") or raw_job.get("rapids_number")
        if not job_id:
            return None

        title = raw_job.get("occupation_title") or raw_job.get("title", "").strip()
        if not title:
            return None

        # Sponsor/company info
        sponsor = raw_job.get("sponsor_name") or raw_job.get("employer_name", "").strip()
        company_name = sponsor if sponsor else "Registered Apprenticeship Program"

        # Description
        description_parts = []
        if raw_job.get("program_description"):
            description_parts.append(raw_job["program_description"])
        if raw_job.get("occupation_description"):
            description_parts.append(raw_job["occupation_description"])
        if raw_job.get("requirements"):
            description_parts.append(f"Requirements: {raw_job['requirements']}")

        # Add apprenticeship details
        duration = raw_job.get("term_length") or raw_job.get("duration_months")
        if duration:
            description_parts.append(f"Program Duration: {duration}")

        wage_info = raw_job.get("starting_wage") or raw_job.get("wage_range")
        if wage_info:
            description_parts.append(f"Starting Wage: {wage_info}")

        description = "\n\n".join(description_parts) if description_parts else f"Registered {title} Apprenticeship Program"

        # Location
        city = raw_job.get("city", "")
        state = raw_job.get("state", "")
        location = f"{city}, {state}" if city and state else city or state or "United States"

        # Determine category based on occupation
        category = self._determine_category(title, description)

        # Extract skills
        skills = self.extract_skills(f"{title} {description}", TRADES_SKILLS)

        # Salary (apprentice wages are typically hourly)
        salary_min = None
        salary_max = None
        salary_period = "hourly"

        starting_wage = raw_job.get("starting_wage")
        if starting_wage:
            try:
                if isinstance(starting_wage, (int, float)):
                    salary_min = int(starting_wage)
                elif isinstance(starting_wage, str):
                    # Parse wage string like "$15.00" or "15.00 - 20.00"
                    import re
                    wages = re.findall(r'[\d.]+', starting_wage)
                    if wages:
                        salary_min = int(float(wages[0]))
                        if len(wages) > 1:
                            salary_max = int(float(wages[-1]))
            except (ValueError, TypeError):
                pass

        # Posted date
        posted_at = None
        date_str = raw_job.get("created_at") or raw_job.get("posted_date")
        if date_str:
            try:
                posted_at = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            except ValueError:
                pass

        # Apply URL
        apply_url = raw_job.get("url") or raw_job.get("apply_url")
        if not apply_url:
            apply_url = f"https://www.apprenticeship.gov/apprenticeship-job-finder?occupation={title.replace(' ', '+')}"

        return ScrapedJob(
            external_id=f"apprenticeship_{job_id}",
            source="apprenticeship",
            title=f"{title} Apprentice",
            company_name=company_name,
            company_logo=None,
            location=location,
            job_type=JobType.APPRENTICESHIP,
            experience_level="Entry Level",
            category=category,
            description=description,
            salary_min=salary_min,
            salary_max=salary_max,
            salary_currency="USD",
            salary_period=salary_period,
            skills=skills,
            remote=False,  # Apprenticeships are typically in-person
            apply_url=apply_url,
            posted_at=posted_at,
        )

    def _determine_category(self, title: str, description: str) -> JobCategory:
        """Determine job category based on title and description"""
        text = f"{title} {description}".lower()

        # Healthcare-related apprenticeships
        healthcare_keywords = ["nurse", "medical", "health", "dental", "pharmacy", "emt", "paramedic"]
        if any(kw in text for kw in healthcare_keywords):
            return JobCategory.HEALTHCARE

        # Public safety
        safety_keywords = ["police", "fire", "emergency", "security", "corrections"]
        if any(kw in text for kw in safety_keywords):
            return JobCategory.PUBLIC_SAFETY

        # Tech apprenticeships
        tech_keywords = ["software", "developer", "programmer", "it ", "cyber", "network", "data"]
        if any(kw in text for kw in tech_keywords):
            return JobCategory.TECH

        # Default to apprenticeship category for trades
        return JobCategory.APPRENTICESHIP
