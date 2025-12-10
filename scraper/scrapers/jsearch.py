import asyncio
import httpx
import logging
from typing import List, Optional
from datetime import datetime

from .base import BaseScraper
from models import ScrapedJob, JobCategory
from config import MAX_JOBS_PER_SOURCE, TECH_SKILLS, TRADES_SKILLS, PUBLIC_SAFETY_SKILLS, HEALTHCARE_SKILLS, JSEARCH_API_KEY

logger = logging.getLogger(__name__)


class JSearchScraper(BaseScraper):
    """Scraper for JSearch API via OpenWebNinja - Google Jobs aggregator"""

    def __init__(self):
        super().__init__("jsearch")
        self.api_url = "https://api.openwebninja.com/jsearch/search"
        self.headers = {
            "x-api-key": JSEARCH_API_KEY,
            "Accept": "application/json",
        }

    async def fetch_jobs(self) -> List[ScrapedJob]:
        """Fetch jobs from JSearch API"""
        jobs: List[ScrapedJob] = []

        if not JSEARCH_API_KEY:
            logger.warning("JSEARCH_API_KEY not set, skipping JSearch scraper")
            return jobs

        # Search queries by category - expanded for more coverage
        search_configs = [
            # Tech jobs - expanded
            {"query": "entry level software developer", "category": JobCategory.TECH},
            {"query": "junior developer", "category": JobCategory.TECH},
            {"query": "software engineer intern", "category": JobCategory.TECH},
            {"query": "junior data analyst", "category": JobCategory.TECH},
            {"query": "entry level web developer", "category": JobCategory.TECH},
            {"query": "junior software engineer", "category": JobCategory.TECH},
            {"query": "entry level programmer", "category": JobCategory.TECH},
            {"query": "junior frontend developer", "category": JobCategory.TECH},
            {"query": "junior backend developer", "category": JobCategory.TECH},
            {"query": "entry level IT support", "category": JobCategory.TECH},
            {"query": "junior DevOps engineer", "category": JobCategory.TECH},
            {"query": "entry level QA tester", "category": JobCategory.TECH},
            {"query": "junior python developer", "category": JobCategory.TECH},
            {"query": "junior javascript developer", "category": JobCategory.TECH},
            {"query": "entry level cybersecurity", "category": JobCategory.TECH},
            {"query": "junior mobile developer", "category": JobCategory.TECH},
            {"query": "entry level cloud engineer", "category": JobCategory.TECH},
            {"query": "junior database administrator", "category": JobCategory.TECH},
            {"query": "entry level network engineer", "category": JobCategory.TECH},
            {"query": "junior UI UX designer", "category": JobCategory.TECH},
            # Trades jobs - expanded
            {"query": "entry level electrician", "category": JobCategory.TRADES},
            {"query": "electrician apprentice", "category": JobCategory.TRADES},
            {"query": "entry level plumber", "category": JobCategory.TRADES},
            {"query": "plumber apprentice", "category": JobCategory.TRADES},
            {"query": "hvac technician entry level", "category": JobCategory.TRADES},
            {"query": "hvac apprentice", "category": JobCategory.TRADES},
            {"query": "welder apprentice", "category": JobCategory.TRADES},
            {"query": "entry level welder", "category": JobCategory.TRADES},
            {"query": "carpenter apprentice", "category": JobCategory.TRADES},
            {"query": "entry level carpenter", "category": JobCategory.TRADES},
            {"query": "construction laborer entry level", "category": JobCategory.TRADES},
            {"query": "construction apprentice", "category": JobCategory.TRADES},
            {"query": "entry level mechanic", "category": JobCategory.TRADES},
            {"query": "automotive technician apprentice", "category": JobCategory.TRADES},
            {"query": "entry level machinist", "category": JobCategory.TRADES},
            {"query": "CNC operator entry level", "category": JobCategory.TRADES},
            {"query": "sheet metal apprentice", "category": JobCategory.TRADES},
            {"query": "pipefitter apprentice", "category": JobCategory.TRADES},
            {"query": "entry level maintenance technician", "category": JobCategory.TRADES},
            {"query": "diesel mechanic apprentice", "category": JobCategory.TRADES},
            # Public Safety jobs - expanded
            {"query": "entry level police officer", "category": JobCategory.PUBLIC_SAFETY},
            {"query": "police academy recruit", "category": JobCategory.PUBLIC_SAFETY},
            {"query": "firefighter trainee", "category": JobCategory.PUBLIC_SAFETY},
            {"query": "entry level firefighter", "category": JobCategory.PUBLIC_SAFETY},
            {"query": "emt entry level", "category": JobCategory.PUBLIC_SAFETY},
            {"query": "paramedic entry level", "category": JobCategory.PUBLIC_SAFETY},
            {"query": "security officer entry level", "category": JobCategory.PUBLIC_SAFETY},
            {"query": "security guard entry level", "category": JobCategory.PUBLIC_SAFETY},
            {"query": "911 dispatcher", "category": JobCategory.PUBLIC_SAFETY},
            {"query": "emergency dispatcher entry level", "category": JobCategory.PUBLIC_SAFETY},
            {"query": "correctional officer entry level", "category": JobCategory.PUBLIC_SAFETY},
            {"query": "park ranger entry level", "category": JobCategory.PUBLIC_SAFETY},
            {"query": "TSA officer entry level", "category": JobCategory.PUBLIC_SAFETY},
            {"query": "border patrol entry level", "category": JobCategory.PUBLIC_SAFETY},
            # Healthcare jobs - expanded
            {"query": "cna entry level", "category": JobCategory.HEALTHCARE},
            {"query": "certified nursing assistant", "category": JobCategory.HEALTHCARE},
            {"query": "medical assistant entry level", "category": JobCategory.HEALTHCARE},
            {"query": "phlebotomist entry level", "category": JobCategory.HEALTHCARE},
            {"query": "patient care technician entry level", "category": JobCategory.HEALTHCARE},
            {"query": "home health aide entry level", "category": JobCategory.HEALTHCARE},
            {"query": "dental assistant entry level", "category": JobCategory.HEALTHCARE},
            {"query": "pharmacy technician entry level", "category": JobCategory.HEALTHCARE},
            {"query": "medical receptionist entry level", "category": JobCategory.HEALTHCARE},
            {"query": "EMT basic entry level", "category": JobCategory.HEALTHCARE},
            {"query": "surgical technician entry level", "category": JobCategory.HEALTHCARE},
            {"query": "medical billing entry level", "category": JobCategory.HEALTHCARE},
            {"query": "LPN entry level", "category": JobCategory.HEALTHCARE},
            {"query": "caregiver entry level", "category": JobCategory.HEALTHCARE},
        ]

        try:
            async with httpx.AsyncClient() as client:
                for config in search_configs:
                    if len(jobs) >= MAX_JOBS_PER_SOURCE:
                        break

                    query = config["query"]
                    category = config["category"]

                    await self.rate_limit()

                    params = {
                        "query": query,
                        "page": "1",
                        "num_pages": "3",  # Fetch 3 pages (~30 jobs per query)
                        "date_posted": "month",  # Jobs from last 30 days
                    }

                    # Retry logic for transient errors
                    max_retries = 3
                    for attempt in range(max_retries):
                        try:
                            response = await client.get(
                                self.api_url,
                                headers=self.headers,
                                params=params,
                                timeout=30.0,
                            )

                            if response.status_code == 429:
                                logger.warning("JSearch API rate limit reached, waiting...")
                                await asyncio.sleep(2)
                                continue

                            if response.status_code >= 500:
                                logger.warning(f"Server error {response.status_code} for '{query}', retry {attempt + 1}/{max_retries}")
                                await asyncio.sleep(1)
                                continue

                            response.raise_for_status()
                            break
                        except httpx.HTTPError as e:
                            if attempt == max_retries - 1:
                                logger.warning(f"Failed after {max_retries} retries for '{query}': {e}")
                                response = None
                            await asyncio.sleep(1)

                    if response is None or response.status_code != 200:
                        continue  # Skip this query and move to next

                    data = response.json()
                    raw_jobs = data.get("data", [])
                    logger.info(f"JSearch query '{query}' returned {len(raw_jobs)} jobs")

                    for raw_job in raw_jobs:
                        if len(jobs) >= MAX_JOBS_PER_SOURCE:
                            break

                        try:
                            job = self._parse_job(raw_job, category)
                            if job and not self._job_exists(jobs, job):
                                jobs.append(job)
                        except Exception as e:
                            logger.warning(f"Failed to parse JSearch job: {e}")
                            continue

        except Exception as e:
            logger.error(f"Error fetching from JSearch: {e}")
            raise

        return jobs

    def _job_exists(self, jobs: List[ScrapedJob], new_job: ScrapedJob) -> bool:
        """Check if job already exists in list (by external_id)"""
        return any(job.external_id == new_job.external_id for job in jobs)

    def _parse_job(self, raw_job: dict, category: JobCategory = JobCategory.TECH) -> Optional[ScrapedJob]:
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

        # Extract skills based on category
        skill_list = self._get_skills_for_category(category)
        skills = self.extract_skills(description + " " + title, skill_list)

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

        # Get publisher (original job board)
        publisher = raw_job.get("job_publisher", "")

        return ScrapedJob(
            external_id=f"jsearch_{job_id}",
            source="jsearch",
            title=title,
            company_name=company_name,
            company_logo=raw_job.get("employer_logo"),
            location=location,
            job_type=job_type,
            experience_level=experience_level,
            category=category,
            description=description,
            salary_min=int(salary_min) if salary_min else None,
            salary_max=int(salary_max) if salary_max else None,
            salary_currency=salary_currency,
            salary_period=salary_period,
            skills=skills,
            remote=is_remote,
            apply_url=raw_job.get("job_apply_link", ""),
            publisher=publisher,
            posted_at=posted_at,
        )

    def _get_skills_for_category(self, category: JobCategory) -> List[str]:
        """Get skill list based on job category"""
        if category == JobCategory.TRADES:
            return TRADES_SKILLS
        elif category == JobCategory.PUBLIC_SAFETY:
            return PUBLIC_SAFETY_SKILLS
        elif category == JobCategory.HEALTHCARE:
            return HEALTHCARE_SKILLS
        else:
            return TECH_SKILLS

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
