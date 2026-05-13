"""
Company slug registry for ATS scrapers.

Companies are loaded from the CompanyATS DB table (see prisma/schema.prisma
and scripts/seed-companies.ts). Each row carries a `priorityTier` field:
    1 = Priority   (fast cadence, scraped first)
    2 = Standard   (current default cadence)
    3 = Low        (reduced cadence, scraped last)

ATS scrapers call load_companies(platform, tiers) per scrape run, so tier
changes take effect immediately without redeploying.
"""

import logging
from typing import List, Tuple

from database import db

logger = logging.getLogger(__name__)


# Map scraper source_name -> Prisma ATSPlatform enum value
_ATS_PLATFORM_BY_SOURCE = {
    "greenhouse": "GREENHOUSE",
    "lever": "LEVER",
    "ashby": "ASHBY",
    "smartrecruiters": "SMARTRECRUITERS",
    "workday": "WORKDAY",
    "workable": "WORKABLE",
    "recruitee": "RECRUITEE",
}


async def load_companies(source_name: str, tiers: List[int]) -> List[Tuple[str, str, str]]:
    """
    Load (id, companyName, slug) triples from CompanyATS for the given ATS source
    and tier filter. Results are ordered by priorityTier ASC then companyName
    ASC, so Tier 1 entries appear first. The `id` is the CompanyATS row's primary
    key — scrapers attach it to each ScrapedJob so JobListing carries a real FK
    back to CompanyATS for downstream HAS scoring.
    """
    platform = _ATS_PLATFORM_BY_SOURCE.get(source_name)
    if not platform:
        logger.error(f"Unknown ATS source_name '{source_name}'")
        return []

    if not db.pool:
        logger.error("Database pool not initialized; cannot load companies")
        return []

    async with db.pool.acquire() as conn:
        rows = await conn.fetch(
            '''
            SELECT id, "companyName", slug
            FROM company_ats
            WHERE "atsPlatform" = $1::"ATSPlatform"
              AND "isActive" = true
              AND "priorityTier" = ANY($2::int[])
            ORDER BY "priorityTier" ASC, "companyName" ASC
            ''',
            platform,
            tiers,
        )

    return [(r["id"], r["companyName"], r["slug"]) for r in rows]
