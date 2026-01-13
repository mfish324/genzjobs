import httpx
import logging
import re
from typing import List, Optional
from datetime import datetime

from .base import BaseScraper
from models import ScrapedJob, JobCategory
from config import MAX_JOBS_PER_SOURCE, TECH_SKILLS

logger = logging.getLogger(__name__)

# Country detection patterns - map locations to country codes
COUNTRY_DETECTION = {
    'DE': [  # Germany
        'berlin', 'munich', 'hamburg', 'frankfurt', 'cologne', 'düsseldorf', 'stuttgart',
        'dortmund', 'essen', 'leipzig', 'bremen', 'dresden', 'hanover', 'nuremberg',
        'duisburg', 'bochum', 'wuppertal', 'bielefeld', 'bonn', 'münster', 'karlsruhe',
        'mannheim', 'augsburg', 'wiesbaden', 'freiburg', 'heidelberg',
        'germany', 'deutschland',
    ],
    'GB': [  # UK
        'london', 'manchester', 'birmingham', 'leeds', 'glasgow', 'liverpool', 'bristol',
        'sheffield', 'edinburgh', 'leicester', 'coventry', 'bradford', 'cardiff', 'belfast',
        'united kingdom', 'england', 'scotland', 'wales', ', uk',
    ],
    'CA': ['toronto', 'montreal', 'vancouver', 'calgary', 'edmonton', 'ottawa', 'winnipeg', 'canada'],
    'IN': ['bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'chennai', 'pune', 'kolkata', 'noida', 'gurgaon', 'india'],
    'AU': ['sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'canberra', 'australia'],
    'FR': ['paris', 'lyon', 'marseille', 'toulouse', 'nice', 'bordeaux', 'france'],
    'NL': ['amsterdam', 'rotterdam', 'the hague', 'utrecht', 'eindhoven', 'netherlands'],
    'ES': ['madrid', 'barcelona', 'valencia', 'seville', 'bilbao', 'spain'],
    'IT': ['rome', 'milan', 'naples', 'turin', 'bologna', 'florence', 'italy'],
    'PL': ['warsaw', 'krakow', 'wroclaw', 'poznan', 'gdansk', 'poland'],
    'IE': ['dublin', 'cork', 'limerick', 'galway', 'ireland'],
    'SE': ['stockholm', 'gothenburg', 'malmo', 'sweden'],
    'CH': ['zurich', 'geneva', 'basel', 'bern', 'lausanne', 'switzerland'],
    'AT': ['vienna', 'graz', 'linz', 'salzburg', 'innsbruck', 'austria'],
    'BE': ['brussels', 'antwerp', 'ghent', 'belgium'],
    'PT': ['lisbon', 'porto', 'portugal'],
    'SG': ['singapore'],
    'JP': ['tokyo', 'osaka', 'japan'],
    'CN': ['shanghai', 'beijing', 'shenzhen', 'china'],
    'HK': ['hong kong'],
    'BR': ['são paulo', 'sao paulo', 'rio de janeiro', 'brazil'],
    'MX': ['mexico city', 'guadalajara', 'mexico'],
    'PH': ['manila', 'philippines'],
    'IL': ['tel aviv', 'israel'],
    'ZA': ['cape town', 'johannesburg', 'south africa'],
    'AE': ['dubai', 'abu dhabi', 'uae'],
    'KR': ['seoul', 'busan', 'south korea'],
}

# German company/title patterns that indicate DE country
GERMAN_PATTERNS = [
    'gmbh', 'e.v.', 'ohg', ' kg', ' ag',
    '(m/w/d)', '(w/m/d)', '(d/m/w)', '(m/f/d)', '(all genders)',
    'werkstudent', 'praktikum', 'ausbildung',
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
                        # Detect country from location, company, and title
                        job.country = self._detect_country(job)
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

    def _detect_country(self, job: ScrapedJob) -> Optional[str]:
        """Detect country from job location, company name, and title"""
        location_lower = (job.location or "").lower()
        company_lower = (job.company_name or "").lower()
        title_lower = (job.title or "").lower()

        combined = f"{location_lower} {company_lower} {title_lower}"

        # Check for German-specific patterns first (most common non-US source)
        for pattern in GERMAN_PATTERNS:
            if pattern in company_lower or pattern in title_lower:
                return "DE"

        # Check location/company/title against country detection patterns
        for country_code, patterns in COUNTRY_DETECTION.items():
            for pattern in patterns:
                if pattern in location_lower:
                    return country_code
                # Also check company name for country names
                if pattern in ['germany', 'deutschland', 'united kingdom', 'canada',
                               'india', 'australia', 'france', 'netherlands', 'spain',
                               'italy', 'poland', 'ireland', 'sweden', 'switzerland',
                               'austria', 'belgium', 'portugal', 'singapore', 'japan',
                               'china', 'hong kong', 'brazil', 'mexico', 'philippines',
                               'israel', 'south africa', 'south korea']:
                    if pattern in combined:
                        return country_code

        # Check for US indicators
        us_state_pattern = r', (al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy|dc)($|,|\s)'
        if re.search(us_state_pattern, location_lower):
            return "US"

        if ', us' in location_lower or 'united states' in location_lower:
            return "US"

        # If purely remote with no location indicators, leave as None
        if job.remote and location_lower in ['remote', 'worldwide', 'anywhere', '']:
            return None

        # Default to None if we can't determine
        return None
