import logging
import asyncio
from datetime import datetime
from typing import Optional, List

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from config import SCRAPE_INTERVAL_MINUTES, JOB_SOURCES
from scrapers import RemotiveScraper, ArbeitnowScraper, JSearchScraper, USAJobsScraper, ApprenticeshipScraper
from database import db
from models import ScrapeResult

logger = logging.getLogger(__name__)


class ScraperScheduler:
    """Scheduler for running job scrapers"""

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.is_running = False
        self.last_run: Optional[datetime] = None
        self.last_results: List[ScrapeResult] = []
        self._scrape_lock = asyncio.Lock()

    def start(self):
        """Start the scheduler"""
        # Add the scrape job
        self.scheduler.add_job(
            self.run_scrapers,
            trigger=IntervalTrigger(minutes=SCRAPE_INTERVAL_MINUTES),
            id="scrape_jobs",
            name="Scrape jobs from all sources",
            replace_existing=True,
        )

        self.scheduler.start()
        logger.info(f"Scheduler started, will run every {SCRAPE_INTERVAL_MINUTES} minutes")

    def stop(self):
        """Stop the scheduler"""
        self.scheduler.shutdown()
        logger.info("Scheduler stopped")

    def get_next_run(self) -> Optional[datetime]:
        """Get the next scheduled run time"""
        job = self.scheduler.get_job("scrape_jobs")
        if job and job.next_run_time:
            return job.next_run_time
        return None

    async def run_scrapers(self) -> List[ScrapeResult]:
        """Run all enabled scrapers"""
        # Prevent concurrent runs
        async with self._scrape_lock:
            self.is_running = True
            results: List[ScrapeResult] = []

            try:
                logger.info("Starting scheduled scrape run")

                # Initialize scrapers
                scrapers = []
                if JOB_SOURCES.get("remotive", {}).get("enabled"):
                    scrapers.append(RemotiveScraper())
                if JOB_SOURCES.get("arbeitnow", {}).get("enabled"):
                    scrapers.append(ArbeitnowScraper())
                if JOB_SOURCES.get("jsearch", {}).get("enabled"):
                    scrapers.append(JSearchScraper())
                if JOB_SOURCES.get("usajobs", {}).get("enabled"):
                    scrapers.append(USAJobsScraper())
                if JOB_SOURCES.get("apprenticeship", {}).get("enabled"):
                    scrapers.append(ApprenticeshipScraper())

                # Run each scraper
                for scraper in scrapers:
                    try:
                        result, jobs = await scraper.scrape()

                        # Save to database
                        if jobs:
                            added, updated = await db.save_jobs(jobs)
                            result.jobs_added = added
                            result.jobs_updated = updated

                        results.append(result)
                        logger.info(
                            f"Scrape complete for {scraper.source_name}: "
                            f"{result.jobs_found} found, {result.jobs_added} added, "
                            f"{result.jobs_updated} updated"
                        )

                    except Exception as e:
                        logger.error(f"Error running scraper {scraper.source_name}: {e}")
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
        """Run a single scraper by name"""
        scraper = None

        if source == "remotive":
            scraper = RemotiveScraper()
        elif source == "arbeitnow":
            scraper = ArbeitnowScraper()
        elif source == "jsearch":
            scraper = JSearchScraper()
        elif source == "usajobs":
            scraper = USAJobsScraper()
        elif source == "apprenticeship":
            scraper = ApprenticeshipScraper()
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
