import httpx
import logging
from typing import List, Optional
from datetime import datetime

from .base import BaseScraper
from models import ScrapedJob, JobCategory
from config import MAX_JOBS_PER_SOURCE, TECH_SKILLS, TRADES_SKILLS, PUBLIC_SAFETY_SKILLS, HEALTHCARE_SKILLS, USAJOBS_API_KEY, USAJOBS_EMAIL

logger = logging.getLogger(__name__)


class USAJobsScraper(BaseScraper):
    """Scraper for USAJobs.gov API - Federal Government Jobs"""

    def __init__(self):
        super().__init__("usajobs")
        self.api_url = "https://data.usajobs.gov/api/search"
        self.headers = {
            "Authorization-Key": USAJOBS_API_KEY,
            "User-Agent": USAJOBS_EMAIL,
            "Host": "data.usajobs.gov",
        }

    async def fetch_jobs(self) -> List[ScrapedJob]:
        """Fetch jobs from USAJobs API"""
        jobs: List[ScrapedJob] = []

        if not USAJOBS_API_KEY or not USAJOBS_EMAIL:
            logger.warning("USAJOBS_API_KEY or USAJOBS_EMAIL not set, skipping USAJobs scraper")
            return jobs

        # Search queries by category targeting entry-level federal jobs
        search_configs = [
            # Tech jobs
            {"params": {"Keyword": "software developer", "JobGradeCode": "5/7/9"}, "category": JobCategory.TECH},
            {"params": {"Keyword": "data analyst", "JobGradeCode": "5/7/9"}, "category": JobCategory.TECH},
            {"params": {"Keyword": "IT specialist", "JobGradeCode": "5/7/9"}, "category": JobCategory.TECH},
            {"params": {"Keyword": "computer scientist", "JobGradeCode": "5/7/9"}, "category": JobCategory.TECH},
            {"params": {"Keyword": "recent graduate", "HiringPath": "student"}, "category": JobCategory.TECH},
            # Trades jobs
            {"params": {"Keyword": "electrician", "JobGradeCode": "5/7/9"}, "category": JobCategory.TRADES},
            {"params": {"Keyword": "mechanic", "JobGradeCode": "5/7/9"}, "category": JobCategory.TRADES},
            {"params": {"Keyword": "maintenance worker", "JobGradeCode": "5/7/9"}, "category": JobCategory.TRADES},
            {"params": {"Keyword": "hvac technician", "JobGradeCode": "5/7/9"}, "category": JobCategory.TRADES},
            {"params": {"Keyword": "carpenter", "JobGradeCode": "5/7/9"}, "category": JobCategory.TRADES},
            {"params": {"Keyword": "welder", "JobGradeCode": "5/7/9"}, "category": JobCategory.TRADES},
            # Public Safety jobs
            {"params": {"Keyword": "police officer", "JobGradeCode": "5/7/9"}, "category": JobCategory.PUBLIC_SAFETY},
            {"params": {"Keyword": "firefighter", "JobGradeCode": "5/7/9"}, "category": JobCategory.PUBLIC_SAFETY},
            {"params": {"Keyword": "security guard", "JobGradeCode": "5/7/9"}, "category": JobCategory.PUBLIC_SAFETY},
            {"params": {"Keyword": "park ranger", "JobGradeCode": "5/7/9"}, "category": JobCategory.PUBLIC_SAFETY},
            {"params": {"Keyword": "correctional officer", "JobGradeCode": "5/7/9"}, "category": JobCategory.PUBLIC_SAFETY},
            # Healthcare jobs
            {"params": {"Keyword": "nurse", "JobGradeCode": "5/7/9"}, "category": JobCategory.HEALTHCARE},
            {"params": {"Keyword": "medical technician", "JobGradeCode": "5/7/9"}, "category": JobCategory.HEALTHCARE},
            {"params": {"Keyword": "healthcare", "JobGradeCode": "5/7/9"}, "category": JobCategory.HEALTHCARE},
        ]

        try:
            async with httpx.AsyncClient() as client:
                for config in search_configs:
                    if len(jobs) >= MAX_JOBS_PER_SOURCE:
                        break

                    query_params = config["params"]
                    category = config["category"]

                    await self.rate_limit()

                    params = {
                        "ResultsPerPage": 25,
                        "DatePosted": 7,  # Last 7 days
                        **query_params,
                    }

                    response = await client.get(
                        self.api_url,
                        headers=self.headers,
                        params=params,
                        timeout=30.0,
                    )

                    if response.status_code == 429:
                        logger.warning("USAJobs API rate limit reached")
                        break

                    response.raise_for_status()
                    data = response.json()

                    search_result = data.get("SearchResult", {})
                    raw_jobs = search_result.get("SearchResultItems", [])
                    logger.info(f"USAJobs query '{query_params.get('Keyword', '')}' returned {len(raw_jobs)} jobs")

                    for item in raw_jobs:
                        if len(jobs) >= MAX_JOBS_PER_SOURCE:
                            break

                        raw_job = item.get("MatchedObjectDescriptor", {})
                        try:
                            job = self._parse_job(raw_job, category)
                            if job and not self._job_exists(jobs, job):
                                jobs.append(job)
                        except Exception as e:
                            logger.warning(f"Failed to parse USAJobs job: {e}")
                            continue

        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching from USAJobs: {e}")
            raise
        except Exception as e:
            logger.error(f"Error fetching from USAJobs: {e}")
            raise

        return jobs

    def _job_exists(self, jobs: List[ScrapedJob], new_job: ScrapedJob) -> bool:
        """Check if job already exists in list (by external_id)"""
        return any(job.external_id == new_job.external_id for job in jobs)

    def _parse_job(self, raw_job: dict, category: JobCategory = JobCategory.TECH) -> Optional[ScrapedJob]:
        """Parse a raw job from USAJobs API"""
        position_id = raw_job.get("PositionID")
        if not position_id:
            return None

        title = raw_job.get("PositionTitle", "").strip()
        if not title:
            return None

        # Organization name
        org_name = raw_job.get("OrganizationName", "").strip()
        dept_name = raw_job.get("DepartmentName", "").strip()
        company_name = org_name or dept_name or "U.S. Government"

        # Description
        description = raw_job.get("UserArea", {}).get("Details", {}).get("JobSummary", "")
        qualifications = raw_job.get("QualificationSummary", "")
        full_description = f"{description}\n\nQualifications:\n{qualifications}" if qualifications else description

        # Location
        locations = raw_job.get("PositionLocation", [])
        if locations:
            loc = locations[0]
            city = loc.get("CityName", "")
            state = loc.get("CountrySubDivisionCode", "")
            location = f"{city}, {state}" if city and state else city or state or "Washington, DC"
        else:
            location = "Washington, DC"

        # Check for remote/telework
        telework = raw_job.get("UserArea", {}).get("Details", {}).get("TeleworkEligible", "")
        is_remote = telework.lower() == "yes" if telework else False

        # Job type - Federal jobs are typically full-time
        schedule = raw_job.get("PositionSchedule", [])
        if schedule:
            schedule_name = schedule[0].get("Name", "").lower()
            if "part" in schedule_name:
                job_type = "Part-time"
            elif "intern" in schedule_name:
                job_type = "Internship"
            else:
                job_type = "Full-time"
        else:
            job_type = "Full-time"

        # Extract skills based on category
        skill_list = self._get_skills_for_category(category)
        skills = self.extract_skills(full_description + " " + title, skill_list)

        # Posted date
        posted_at = None
        pub_date = raw_job.get("PublicationStartDate")
        if pub_date:
            try:
                posted_at = datetime.fromisoformat(pub_date.replace("Z", "+00:00"))
            except ValueError:
                pass

        # Salary
        salary_min = None
        salary_max = None
        remuneration = raw_job.get("PositionRemuneration", [])
        if remuneration:
            salary_info = remuneration[0]
            try:
                salary_min = int(float(salary_info.get("MinimumRange", 0)))
                salary_max = int(float(salary_info.get("MaximumRange", 0)))
            except (ValueError, TypeError):
                pass

        # Experience level from grade
        job_grade = raw_job.get("JobGrade", [])
        experience_level = "Entry Level"  # Default for government jobs we're targeting
        if job_grade:
            grade_code = job_grade[0].get("Code", "")
            if grade_code:
                try:
                    grade_num = int(grade_code.split("-")[-1]) if "-" in grade_code else int(grade_code)
                    if grade_num <= 7:
                        experience_level = "Entry Level"
                    elif grade_num <= 11:
                        experience_level = "Mid Level"
                    elif grade_num <= 13:
                        experience_level = "Senior Level"
                    else:
                        experience_level = "Lead"
                except ValueError:
                    pass

        # Apply URL
        apply_url = raw_job.get("PositionURI", "")

        return ScrapedJob(
            external_id=f"usajobs_{position_id}",
            source="usajobs",
            title=title,
            company_name=company_name,
            company_logo=None,  # USAJobs doesn't provide logos
            location=location,
            job_type=job_type,
            experience_level=experience_level,
            category=category,
            description=full_description,
            salary_min=salary_min if salary_min else None,
            salary_max=salary_max if salary_max else None,
            salary_currency="USD",
            salary_period="yearly",
            skills=skills,
            remote=is_remote,
            apply_url=apply_url,
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
