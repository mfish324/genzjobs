import logging
import asyncio
from datetime import datetime
from typing import Optional, List

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from config import (
    SCRAPE_INTERVAL_MINUTES,
    TIER1_SCRAPE_INTERVAL_MINUTES,
    TIER3_SCRAPE_INTERVAL_MINUTES,
    JOB_SOURCES,
)
from scrapers import (
    RemotiveScraper, ArbeitnowScraper, JSearchScraper, USAJobsScraper, ApprenticeshipScraper,
    GreenhouseScraper, LeverScraper, AshbyScraper, SmartRecruitersScraper,
    WorkableScraper, RecruiteeScraper, WorkdayScraper,
)
from database import db
from models import ScrapeResult

logger = logging.getLogger(__name__)


# ATS scrapers iterate over CompanyATS rows and accept a `tiers` filter.
ATS_SCRAPER_CLASSES = {
    "greenhouse": GreenhouseScraper,
    "lever": LeverScraper,
    "ashby": AshbyScraper,
    "smartrecruiters": SmartRecruitersScraper,
    "workable": WorkableScraper,
    "recruitee": RecruiteeScraper,
    "workday": WorkdayScraper,
}

# Non-ATS scrapers pull from public job APIs and have no per-company concept.
# They run on the standard cadence only.
NON_ATS_SCRAPER_CLASSES = {
    "remotive": RemotiveScraper,
    "arbeitnow": ArbeitnowScraper,
    "jsearch": JSearchScraper,
    "usajobs": USAJobsScraper,
    "apprenticeship": ApprenticeshipScraper,
}


class ScraperScheduler:
    """Scheduler for running job scrapers.

    Runs three independent jobs against the same scraper pool, filtered by
    CompanyATS.priorityTier:
        - Tier 1 ATS only      every TIER1_SCRAPE_INTERVAL_MINUTES (default 60)
        - Tier 2 ATS + non-ATS every SCRAPE_INTERVAL_MINUTES       (default 240)
        - Tier 3 ATS only      every TIER3_SCRAPE_INTERVAL_MINUTES (default 1440)

    Manual POST /scrape still scrapes all tiers and all sources (back-compat).
    """

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.is_running = False
        self.last_run: Optional[datetime] = None
        self.last_results: List[ScrapeResult] = []
        self._scrape_lock = asyncio.Lock()

    def start(self):
        """Start the three scheduled jobs."""
        self.scheduler.add_job(
            self.run_tier1_scrape,
            trigger=IntervalTrigger(minutes=TIER1_SCRAPE_INTERVAL_MINUTES),
            id="scrape_tier1",
            name="Scrape Tier 1 ATS companies",
            replace_existing=True,
        )
        self.scheduler.add_job(
            self.run_standard_scrape,
            trigger=IntervalTrigger(minutes=SCRAPE_INTERVAL_MINUTES),
            id="scrape_standard",
            name="Scrape Tier 2 ATS + non-ATS APIs",
            replace_existing=True,
        )
        self.scheduler.add_job(
            self.run_tier3_scrape,
            trigger=IntervalTrigger(minutes=TIER3_SCRAPE_INTERVAL_MINUTES),
            id="scrape_tier3",
            name="Scrape Tier 3 ATS companies",
            replace_existing=True,
        )
        self.scheduler.start()
        logger.info(
            "Scheduler started: "
            f"Tier 1 every {TIER1_SCRAPE_INTERVAL_MINUTES}m, "
            f"Standard every {SCRAPE_INTERVAL_MINUTES}m, "
            f"Tier 3 every {TIER3_SCRAPE_INTERVAL_MINUTES}m"
        )

    def stop(self):
        """Stop the scheduler."""
        self.scheduler.shutdown()
        logger.info("Scheduler stopped")

    def get_next_run(self) -> Optional[datetime]:
        """Get the soonest next scheduled run across all three jobs."""
        next_times = []
        for job_id in ("scrape_tier1", "scrape_standard", "scrape_tier3"):
            job = self.scheduler.get_job(job_id)
            if job and job.next_run_time:
                next_times.append(job.next_run_time)
        return min(next_times) if next_times else None

    async def run_tier1_scrape(self) -> List[ScrapeResult]:
        return await self._run_scrape(ats_tiers=[1], include_non_ats=False, label="tier1")

    async def run_tier3_scrape(self) -> List[ScrapeResult]:
        return await self._run_scrape(ats_tiers=[3], include_non_ats=False, label="tier3")

    async def run_standard_scrape(self) -> List[ScrapeResult]:
        return await self._run_scrape(ats_tiers=[2], include_non_ats=True, label="standard")

    async def run_scrapers(self) -> List[ScrapeResult]:
        """Manual /scrape trigger — runs everything (all tiers, all sources)."""
        return await self._run_scrape(ats_tiers=[1, 2, 3], include_non_ats=True, label="manual")

    async def _run_scrape(
        self,
        ats_tiers: List[int],
        include_non_ats: bool,
        label: str,
    ) -> List[ScrapeResult]:
        async with self._scrape_lock:
            self.is_running = True
            results: List[ScrapeResult] = []

            try:
                logger.info(
                    f"[{label}] Starting scrape: ats_tiers={ats_tiers}, "
                    f"include_non_ats={include_non_ats}"
                )

                scrapers = []
                for src, cls in ATS_SCRAPER_CLASSES.items():
                    if JOB_SOURCES.get(src, {}).get("enabled"):
                        scrapers.append(cls(tiers=ats_tiers))
                if include_non_ats:
                    for src, cls in NON_ATS_SCRAPER_CLASSES.items():
                        if JOB_SOURCES.get(src, {}).get("enabled"):
                            scrapers.append(cls())

                for scraper in scrapers:
                    try:
                        result, jobs = await scraper.scrape()

                        if jobs:
                            added, updated = await db.save_jobs(jobs)
                            result.jobs_added = added
                            result.jobs_updated = updated

                        results.append(result)
                        logger.info(
                            f"[{label}] {scraper.source_name}: "
                            f"{result.jobs_found} found, {result.jobs_added} added, "
                            f"{result.jobs_updated} updated"
                        )

                    except Exception as e:
                        logger.error(f"[{label}] Error running scraper {scraper.source_name}: {e}")
                        results.append(ScrapeResult(
                            source=scraper.source_name,
                            jobs_found=0,
                            jobs_added=0,
                            jobs_updated=0,
                            errors=[str(e)],
                            duration_seconds=0,
                        ))

                self.last_run = datetime.utcnow()
                self.last_results = results

            finally:
                self.is_running = False

            return results

    async def run_single_scraper(self, source: str) -> Optional[ScrapeResult]:
        """Run a single scraper by name (POST /scrape/{source}). All tiers."""
        if source in ATS_SCRAPER_CLASSES:
            scraper = ATS_SCRAPER_CLASSES[source](tiers=[1, 2, 3])
        elif source in NON_ATS_SCRAPER_CLASSES:
            scraper = NON_ATS_SCRAPER_CLASSES[source]()
        else:
            return None

        try:
            result, jobs = await scraper.scrape()

            if jobs:
                added, updated = await db.save_jobs(jobs)
                result.jobs_added = added
                result.jobs_updated = updated

            return result

        except Exception as e:
            logger.error(f"Error running single scraper {source}: {e}")
            return ScrapeResult(
                source=source,
                jobs_found=0,
                jobs_added=0,
                jobs_updated=0,
                errors=[str(e)],
                duration_seconds=0,
            )


# Singleton scheduler instance
scraper_scheduler = ScraperScheduler()
