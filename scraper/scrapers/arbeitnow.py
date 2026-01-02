import httpx
import logging
from typing import List, Optional
from datetime import datetime

from .base import BaseScraper
from models import ScrapedJob, JobCategory
from config import MAX_JOBS_PER_SOURCE, TECH_SKILLS

logger = logging.getLogger(__name__)

# Non-US location patterns to filter out (comprehensive list)
NON_US_LOCATION_PATTERNS = [
    # Germany - cities
    'berlin', 'munich', 'hamburg', 'frankfurt', 'cologne', 'düsseldorf', 'stuttgart',
    'dortmund', 'essen', 'leipzig', 'bremen', 'dresden', 'hanover', 'nuremberg',
    'duisburg', 'bochum', 'wuppertal', 'bielefeld', 'bonn', 'münster', 'karlsruhe',
    'mannheim', 'augsburg', 'wiesbaden', 'freiburg', 'heidelberg',
    'germany', 'deutschland',
    # UK
    'london', 'manchester', 'birmingham', 'leeds', 'glasgow', 'liverpool', 'bristol',
    'sheffield', 'edinburgh', 'leicester', 'coventry', 'bradford', 'cardiff', 'belfast',
    'united kingdom', 'england', 'scotland', 'wales',
    # Canada
    'toronto', 'montreal', 'vancouver', 'calgary', 'edmonton', 'ottawa', 'winnipeg',
    'ontario', 'british columbia', 'alberta', 'quebec',
    # India
    'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'chennai', 'pune',
    'kolkata', 'noida', 'gurgaon', 'gurugram',
    # Australia
    'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'canberra',
    # France
    'paris', 'lyon', 'marseille', 'toulouse', 'nice', 'bordeaux',
    # Netherlands
    'amsterdam', 'rotterdam', 'the hague', 'utrecht', 'eindhoven',
    # Spain
    'madrid', 'barcelona', 'valencia', 'seville', 'bilbao',
    # Italy
    'rome', 'milan', 'naples', 'turin', 'bologna', 'florence',
    # Poland
    'warsaw', 'krakow', 'wroclaw', 'poznan', 'gdansk',
    # Ireland
    'dublin', 'cork', 'limerick', 'galway',
    # Sweden
    'stockholm', 'gothenburg', 'malmo',
    # Switzerland
    'zurich', 'geneva', 'basel', 'bern', 'lausanne',
    # Austria
    'vienna', 'graz', 'linz', 'salzburg', 'innsbruck',
    # Belgium
    'brussels', 'antwerp', 'ghent',
    # Portugal
    'lisbon', 'porto',
    # Other
    'singapore', 'tokyo', 'osaka', 'shanghai', 'beijing', 'shenzhen', 'hong kong',
    'são paulo', 'sao paulo', 'rio de janeiro', 'mexico city', 'manila', 'tel aviv',
    'cape town', 'johannesburg', 'dubai', 'seoul',
    # Regional exclusions
    'europe only', 'emea only', 'apac only', 'latam only',
]

# Non-US company name patterns
NON_US_COMPANY_PATTERNS = [
    'gmbh', 'e.v.', 'ohg', ' kg', ' ag',  # German
    'pvt ltd', 'pvt. ltd', 'pty ltd',  # India/Australia
    's.a.', 's.l.', 'b.v.', 'n.v.', 'a/s', ' ab', ' oy', 's.p.a.', 's.r.l.',  # European
]

# German job title patterns
GERMAN_TITLE_PATTERNS = [
    '(m/w/d)', '(w/m/d)', '(d/m/w)', '(m/f/d)', '(all genders)',
    'werkstudent', 'praktikum', 'ausbildung', 'sachbearbeiter',
    'mitarbeiter', 'entwickler', 'berater', 'ingenieur',
    'kaufmann', 'kauffrau', 'fachkraft',
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
                        # STRICT US-ONLY FILTER: Multiple checks
                        location_lower = (job.location or "").lower()
                        company_lower = (job.company_name or "").lower()
                        title_lower = (job.title or "").lower()

                        # Check location
                        if any(pattern in location_lower for pattern in NON_US_LOCATION_PATTERNS):
                            logger.debug(f"Skipping non-US location: {job.title} in {job.location}")
                            continue

                        # Check company name
                        if any(pattern in company_lower for pattern in NON_US_COMPANY_PATTERNS):
                            logger.debug(f"Skipping non-US company: {job.title} at {job.company_name}")
                            continue

                        # Check title for German patterns
                        if any(pattern in title_lower for pattern in GERMAN_TITLE_PATTERNS):
                            logger.debug(f"Skipping German title: {job.title}")
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
