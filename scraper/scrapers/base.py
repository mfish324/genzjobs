from abc import ABC, abstractmethod
from typing import List, Optional
import asyncio
import logging
from datetime import datetime

from models import ScrapedJob, ScrapeResult, ClassifiedExperienceLevel
from config import REQUEST_DELAY_SECONDS
from classification import classify_job_with_company, JobInput

logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    """Base class for all job scrapers"""

    def __init__(self, source_name: str):
        self.source_name = source_name
        self.delay = REQUEST_DELAY_SECONDS

    @abstractmethod
    async def fetch_jobs(self) -> List[ScrapedJob]:
        """Fetch jobs from the source. Must be implemented by subclasses."""
        pass

    async def scrape(self) -> ScrapeResult:
        """Run the scraper and return results"""
        start_time = datetime.utcnow()
        errors: List[str] = []
        jobs: List[ScrapedJob] = []

        try:
            logger.info(f"Starting scrape for {self.source_name}")
            jobs = await self.fetch_jobs()
            logger.info(f"Found {len(jobs)} jobs from {self.source_name}")

            # Classify all jobs
            jobs = self.classify_jobs(jobs)
            logger.info(f"Classified {len(jobs)} jobs from {self.source_name}")
        except Exception as e:
            error_msg = f"Error scraping {self.source_name}: {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)

        duration = (datetime.utcnow() - start_time).total_seconds()

        return ScrapeResult(
            source=self.source_name,
            jobs_found=len(jobs),
            jobs_added=0,  # Will be updated after DB save
            jobs_updated=0,
            errors=errors,
            duration_seconds=duration
        ), jobs

    def classify_jobs(self, jobs: List[ScrapedJob]) -> List[ScrapedJob]:
        """Classify all jobs by experience level and audience tags"""
        classified_jobs = []
        stats = {"ENTRY": 0, "MID": 0, "SENIOR": 0, "EXECUTIVE": 0}

        for job in jobs:
            try:
                # Create input for classifier
                job_input = JobInput(
                    title=job.title,
                    description=job.description,
                    salary_min=job.salary_min,
                    salary_max=job.salary_max,
                    location=job.location,
                    company=job.company_name
                )

                # Run classification
                result = classify_job_with_company(job_input)

                # Update job with classification
                job.classified_level = ClassifiedExperienceLevel(result.experience_level.value)
                job.audience_tags = result.audience_tags
                job.classification_confidence = result.confidence

                stats[result.experience_level.value] += 1
            except Exception as e:
                logger.warning(f"Failed to classify job {job.external_id}: {e}")
                # Default to MID if classification fails
                job.classified_level = ClassifiedExperienceLevel.MID
                job.audience_tags = ["mid_career"]
                job.classification_confidence = 0.3

            classified_jobs.append(job)

        # Log classification stats
        total = len(classified_jobs)
        if total > 0:
            logger.info(
                f"Classification stats for {self.source_name}: "
                f"Entry={stats['ENTRY']} ({stats['ENTRY']/total*100:.1f}%), "
                f"Mid={stats['MID']} ({stats['MID']/total*100:.1f}%), "
                f"Senior={stats['SENIOR']} ({stats['SENIOR']/total*100:.1f}%), "
                f"Executive={stats['EXECUTIVE']} ({stats['EXECUTIVE']/total*100:.1f}%)"
            )

        return classified_jobs

    def extract_skills(self, text: str, skill_list: List[str]) -> List[str]:
        """Extract skills from text based on a skill list"""
        if not text:
            return []

        text_lower = text.lower()
        found_skills = []

        for skill in skill_list:
            if skill.lower() in text_lower:
                found_skills.append(skill)

        return list(set(found_skills))

    def parse_salary(self, salary_str: Optional[str]) -> tuple[Optional[int], Optional[int]]:
        """Parse salary string to min/max values"""
        if not salary_str:
            return None, None

        import re

        # Remove currency symbols and clean up
        cleaned = re.sub(r'[^\d\-kK]', ' ', salary_str)

        # Find numbers
        numbers = re.findall(r'(\d+)([kK])?', cleaned)

        if not numbers:
            return None, None

        values = []
        for num, k in numbers:
            value = int(num)
            if k:
                value *= 1000
            values.append(value)

        if len(values) == 1:
            return values[0], values[0]
        elif len(values) >= 2:
            return min(values), max(values)

        return None, None

    def determine_experience_level(self, text: str) -> Optional[str]:
        """Determine experience level from job text"""
        text_lower = text.lower()

        if any(word in text_lower for word in ['intern', 'internship']):
            return "Entry Level"
        if any(word in text_lower for word in ['entry', 'junior', 'graduate', 'trainee', '0-2 years', '1-2 years']):
            return "Entry Level"
        if any(word in text_lower for word in ['mid', 'intermediate', '2-5 years', '3-5 years']):
            return "Mid Level"
        if any(word in text_lower for word in ['senior', 'sr.', '5+ years', '5-8 years']):
            return "Senior Level"
        if any(word in text_lower for word in ['lead', 'principal', 'staff']):
            return "Lead"
        if any(word in text_lower for word in ['manager', 'director', 'head of']):
            return "Manager"

        return None

    def determine_job_type(self, text: str) -> Optional[str]:
        """Determine job type from text"""
        text_lower = text.lower()

        if 'intern' in text_lower:
            return "Internship"
        if 'contract' in text_lower or 'contractor' in text_lower:
            return "Contract"
        if 'part-time' in text_lower or 'part time' in text_lower:
            return "Part-time"
        if 'freelance' in text_lower:
            return "Freelance"
        if 'temporary' in text_lower or 'temp ' in text_lower:
            return "Temporary"
        if 'full-time' in text_lower or 'full time' in text_lower:
            return "Full-time"

        return "Full-time"  # Default

    async def rate_limit(self):
        """Apply rate limiting between requests"""
        await asyncio.sleep(self.delay)
