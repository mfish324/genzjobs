"""
Job Classification Module (Python)

Classifies jobs by experience level and audience tags for multi-platform targeting.
Port of the TypeScript classification module for use in the Python scraper.
"""

import re
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Literal, Tuple
from enum import Enum


# ==================== Types ====================

class ExperienceLevel(str, Enum):
    ENTRY = "ENTRY"
    MID = "MID"
    SENIOR = "SENIOR"
    EXECUTIVE = "EXECUTIVE"


AudienceTag = Literal['genz', 'mid_career', 'senior', 'executive']


@dataclass
class ClassificationSignals:
    title_match: Optional[str] = None
    years_required: Optional[Dict[str, int]] = None  # {"min": X, "max": Y}
    salary_band: Optional[str] = None
    description_signals: List[str] = field(default_factory=list)


@dataclass
class ClassificationResult:
    experience_level: ExperienceLevel
    audience_tags: List[AudienceTag]
    confidence: float
    signals: ClassificationSignals


@dataclass
class JobInput:
    title: str
    description: str
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    location: Optional[str] = None
    company: Optional[str] = None


# ==================== Signal Definitions ====================

TITLE_SIGNALS = {
    "entry": [
        'intern', 'internship', 'entry level', 'entry-level',
        'junior', 'associate', 'coordinator', 'assistant',
        'trainee', 'apprentice', 'graduate', 'early career',
        'new grad', 'jr.', 'jr ', 'student', 'fellowship',
        'residency', 'resident'
    ],
    "mid": [
        'specialist', 'analyst', 'manager', 'lead',
        'supervisor', 'experienced', 'mid-level', 'mid level',
        'team lead', 'project manager'
    ],
    "senior": [
        'senior', 'sr.', 'sr ', 'director', 'head of', 'principal',
        'staff engineer', 'staff developer', 'architect',
        'senior manager', 'engineering manager'
    ],
    "executive": [
        'vice president', 'chief executive', 'chief technology', 'chief financial',
        'chief operating', 'chief marketing', 'chief information',
        'executive director', 'svp', 'evp', 'general manager',
        'founder', 'co-founder', 'managing director'
    ]
}

# Executive signals that need word boundary matching
EXECUTIVE_WORD_BOUNDARY_SIGNALS = [
    'vp', 'cto', 'cfo', 'ceo', 'coo', 'cmo', 'cio', 'president', 'partner', 'gm'
]

# Words that look like seniority indicators but aren't
SENIOR_BLOCKLIST = [
    'senior living', 'senior care', 'senior center', 'senior community',
    'senior services', 'senior citizen', 'senior housing', 'senior residence',
    'senior home', 'senior wellness'
]

# Retail/service companies where "manager" is often entry-level
RETAIL_SERVICE_COMPANIES = [
    'mcdonald', 'burger king', 'wendy', 'taco bell', 'kfc',
    'subway', 'starbucks', 'dunkin', 'chipotle', 'chick-fil-a',
    'walmart', 'target', 'costco', 'cvs', 'walgreens',
    'dollar general', 'dollar tree', 'family dollar',
    'pizza hut', 'domino', 'papa john'
]

# Description signals for additional context
DESCRIPTION_SIGNALS = {
    "entry": [
        'no experience required', 'no experience necessary', 'no experience needed',
        'no prior experience', 'entry level position', 'entry-level position',
        'recent graduate', 'fresh graduate', 'will train', 'training provided',
        'learn on the job'
    ],
    "mid": [
        'manage a team', 'lead a team', 'team management',
        '2-3 years', '3-5 years', 'proven track record'
    ],
    "senior": [
        'report to the ceo', 'report to the cto', 'report to the cfo',
        'reports to ceo', 'reports to cto', 'report directly to',
        'extensive experience', 'expert level', 'deep expertise',
        '7+ years', '8+ years', '10+ years'
    ],
    "executive": [
        'board of directors', 'c-suite', 'executive team',
        'p&l responsibility', 'profit and loss', 'company strategy',
        'organizational strategy', '15+ years', '20+ years'
    ]
}


# ==================== Helper Functions ====================

def is_reasonable_years(years: int) -> bool:
    """Validate years are reasonable (0-25 range)"""
    return 0 <= years <= 25


def parse_years_required(text: str) -> Optional[Dict[str, int]]:
    """Parse years of experience from job description"""
    lower_text = text.lower()

    # Check for "no experience" patterns first
    if re.search(r'no experience (?:required|necessary|needed)', lower_text) or \
       re.search(r'entry.?level', lower_text):
        return {"min": 0, "max": 0}

    # Pattern: "X-Y years" or "X to Y years" (with experience context)
    range_match = re.search(
        r'(\d{1,2})\s*(?:to|-)\s*(\d{1,2})\s*(?:\+)?\s*years?\s*(?:of\s+)?(?:experience|exp)?',
        lower_text, re.IGNORECASE
    )
    if range_match:
        min_years = int(range_match.group(1))
        max_years = int(range_match.group(2))
        if is_reasonable_years(min_years) and is_reasonable_years(max_years):
            return {"min": min_years, "max": max_years}

    # Pattern: "X+ years"
    plus_match = re.search(
        r'(\d{1,2})\+\s*years?\s*(?:of\s+)?(?:experience|exp)?',
        lower_text, re.IGNORECASE
    )
    if plus_match:
        years = int(plus_match.group(1))
        if is_reasonable_years(years):
            return {"min": years, "max": min(years + 5, 25)}

    # Pattern: "minimum X years" or "at least X years"
    min_match = re.search(
        r'(?:minimum|at least|min\.?)\s*(\d{1,2})\s*years?\s*(?:of\s+)?(?:experience|exp)?',
        lower_text, re.IGNORECASE
    )
    if min_match:
        years = int(min_match.group(1))
        if is_reasonable_years(years):
            return {"min": years, "max": min(years + 3, 25)}

    # Pattern: "X years of experience"
    simple_match = re.search(
        r'(\d{1,2})\s*years?\s*(?:of\s+)?experience',
        lower_text, re.IGNORECASE
    )
    if simple_match:
        years = int(simple_match.group(1))
        if is_reasonable_years(years):
            return {"min": years, "max": years}

    return None


def years_to_level(years: Dict[str, int]) -> ExperienceLevel:
    """Map years of experience to experience level"""
    avg = (years["min"] + years["max"]) / 2

    if avg <= 2:
        return ExperienceLevel.ENTRY
    if avg <= 5:
        return ExperienceLevel.MID
    if avg <= 10:
        return ExperienceLevel.SENIOR
    return ExperienceLevel.EXECUTIVE


def salary_to_level(salary_min: Optional[int], salary_max: Optional[int]) -> Optional[ExperienceLevel]:
    """Map salary to experience level (adjusted for tech)"""
    if not salary_min and not salary_max:
        return None

    salary = (salary_min + salary_max) / 2 if salary_min and salary_max else (salary_min or salary_max)

    if salary < 60000:
        return ExperienceLevel.ENTRY
    if salary < 100000:
        return ExperienceLevel.MID
    if salary < 200000:
        return ExperienceLevel.SENIOR
    return ExperienceLevel.EXECUTIVE


def get_salary_band(salary_min: Optional[int], salary_max: Optional[int]) -> Optional[str]:
    """Get salary band description"""
    if not salary_min and not salary_max:
        return None

    salary = (salary_min + salary_max) / 2 if salary_min and salary_max else (salary_min or salary_max)

    if salary < 60000:
        return "<$60k (entry)"
    if salary < 100000:
        return "$60k-$100k (mid)"
    if salary < 200000:
        return "$100k-$200k (senior)"
    return ">$200k (executive)"


def is_senior_blocklisted(title: str) -> bool:
    """Check if title contains a blocklisted 'senior' phrase"""
    lower_title = title.lower()
    return any(phrase in lower_title for phrase in SENIOR_BLOCKLIST)


def is_retail_service_company(company: Optional[str]) -> bool:
    """Check if company is retail/service"""
    if not company:
        return False
    lower_company = company.lower()
    return any(name in lower_company for name in RETAIL_SERVICE_COMPANIES)


def matches_with_word_boundary(text: str, signal: str) -> bool:
    """Check if a word boundary signal matches in text"""
    pattern = rf'\b{re.escape(signal)}\b'
    return bool(re.search(pattern, text, re.IGNORECASE))


def analyze_title_signals(title: str) -> Tuple[Optional[ExperienceLevel], Optional[str]]:
    """Analyze job title for experience level signals"""
    lower_title = title.lower()

    # Check for blocklisted "senior" phrases first
    if is_senior_blocklisted(title):
        for signal in TITLE_SIGNALS["entry"]:
            if signal in lower_title:
                return ExperienceLevel.ENTRY, signal
        return ExperienceLevel.MID, "senior (care context)"

    # Check executive word-boundary signals first
    for signal in EXECUTIVE_WORD_BOUNDARY_SIGNALS:
        if matches_with_word_boundary(lower_title, signal):
            return ExperienceLevel.EXECUTIVE, signal

    # Check executive phrase signals
    for signal in TITLE_SIGNALS["executive"]:
        if signal in lower_title:
            return ExperienceLevel.EXECUTIVE, signal

    # Check senior signals
    for signal in TITLE_SIGNALS["senior"]:
        if signal in lower_title:
            return ExperienceLevel.SENIOR, signal

    # Check entry signals
    for signal in TITLE_SIGNALS["entry"]:
        if signal in lower_title:
            return ExperienceLevel.ENTRY, signal

    # Check mid signals last
    for signal in TITLE_SIGNALS["mid"]:
        if signal in lower_title:
            return ExperienceLevel.MID, signal

    return None, None


def analyze_description_signals(description: str) -> Tuple[Optional[ExperienceLevel], List[str]]:
    """Analyze description for experience level signals"""
    lower_desc = description.lower()
    matches = []
    level = None

    # Check in order of specificity
    for signal in DESCRIPTION_SIGNALS["executive"]:
        if signal in lower_desc:
            matches.append(signal)
            level = ExperienceLevel.EXECUTIVE

    if not level:
        for signal in DESCRIPTION_SIGNALS["senior"]:
            if signal in lower_desc:
                matches.append(signal)
                level = ExperienceLevel.SENIOR

    if not level:
        for signal in DESCRIPTION_SIGNALS["entry"]:
            if signal in lower_desc:
                matches.append(signal)
                level = ExperienceLevel.ENTRY

    if not level:
        for signal in DESCRIPTION_SIGNALS["mid"]:
            if signal in lower_desc:
                matches.append(signal)
                level = ExperienceLevel.MID

    return level, matches


def level_to_audience_tags(level: ExperienceLevel) -> List[AudienceTag]:
    """Map experience level to audience tags"""
    mapping = {
        ExperienceLevel.ENTRY: ['genz'],
        ExperienceLevel.MID: ['mid_career'],
        ExperienceLevel.SENIOR: ['senior'],
        ExperienceLevel.EXECUTIVE: ['executive']
    }
    return mapping.get(level, ['mid_career'])


# ==================== Main Classification Function ====================

def classify_job(job: JobInput) -> ClassificationResult:
    """
    Classify a job by experience level and audience tags.

    Uses weighted scoring:
    - Title analysis: 10 points
    - Experience years: 8 points
    - Salary analysis: 5 points
    - Description signals: 3 points
    """
    signals = ClassificationSignals()

    # Scoring by level
    scores: Dict[ExperienceLevel, int] = {
        ExperienceLevel.ENTRY: 0,
        ExperienceLevel.MID: 0,
        ExperienceLevel.SENIOR: 0,
        ExperienceLevel.EXECUTIVE: 0
    }

    total_weight = 0

    # 1. Title Analysis (weight: 10)
    title_level, title_match = analyze_title_signals(job.title)
    if title_level:
        scores[title_level] += 10
        total_weight += 10
        signals.title_match = title_match

    # 2. Experience Years Parsing (weight: 8)
    years = parse_years_required(job.description)
    if years:
        years_level = years_to_level(years)
        scores[years_level] += 8
        total_weight += 8
        signals.years_required = years

    # 3. Salary Analysis (weight: 5)
    salary_level = salary_to_level(job.salary_min, job.salary_max)
    if salary_level:
        scores[salary_level] += 5
        total_weight += 5
        signals.salary_band = get_salary_band(job.salary_min, job.salary_max)

    # 4. Description Signals (weight: 3)
    desc_level, desc_matches = analyze_description_signals(job.description)
    if desc_level:
        scores[desc_level] += 3
        total_weight += 3
        if desc_matches:
            signals.description_signals = desc_matches

    # Determine winning level
    max_score = 0
    winning_level = ExperienceLevel.MID  # Default

    for level, score in scores.items():
        if score > max_score:
            max_score = score
            winning_level = level

    # Calculate confidence (0-1)
    if total_weight == 0:
        confidence = 0.3
    else:
        confidence = max_score / total_weight
        signal_count = sum(1 for s in scores.values() if s > 0)
        if signal_count == 1:
            confidence *= 0.9

    # Determine audience tags
    audience_tags = level_to_audience_tags(winning_level)

    # Handle ambiguous cases - allow dual-tagging
    if confidence < 0.5 and total_weight > 0:
        sorted_levels = sorted(
            [(level, score) for level, score in scores.items() if score > 0],
            key=lambda x: x[1],
            reverse=True
        )
        if len(sorted_levels) >= 2:
            first_score = sorted_levels[0][1]
            second_level, second_score = sorted_levels[1]
            if first_score - second_score <= 3:
                second_tags = level_to_audience_tags(second_level)
                audience_tags = list(set(audience_tags + second_tags))

    return ClassificationResult(
        experience_level=winning_level,
        audience_tags=audience_tags,
        confidence=round(confidence, 2),
        signals=signals
    )


def classify_job_with_company(job: JobInput) -> ClassificationResult:
    """Classify a job with company context (for retail/service disambiguation)"""
    base_result = classify_job(job)

    # Check for retail/service manager disambiguation
    if job.company and is_retail_service_company(job.company):
        lower_title = job.title.lower()

        if 'manager' in lower_title and 'general manager' not in lower_title:
            salary_level = salary_to_level(job.salary_min, job.salary_max)

            if not salary_level or salary_level == ExperienceLevel.ENTRY:
                new_signals = ClassificationSignals(
                    title_match=base_result.signals.title_match,
                    years_required=base_result.signals.years_required,
                    salary_band=base_result.signals.salary_band,
                    description_signals=base_result.signals.description_signals + ['retail/service manager context']
                )
                return ClassificationResult(
                    experience_level=ExperienceLevel.ENTRY,
                    audience_tags=['genz'],
                    confidence=max(base_result.confidence, 0.7),
                    signals=new_signals
                )

    return base_result
