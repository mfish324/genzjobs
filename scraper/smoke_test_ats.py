"""
Smoke test for ATS scrapers: verifies that scraped jobs carry company_ats_id
and that the DB write path persists it correctly.

Usage:
    python scraper/smoke_test_ats.py [source] [--save] [--max N]

Examples:
    python scraper/smoke_test_ats.py greenhouse           # fetch only, no DB write
    python scraper/smoke_test_ats.py greenhouse --save    # fetch + save (caps at 5 jobs)
    python scraper/smoke_test_ats.py lever --max 20

Defaults: source=greenhouse, max=50, save=False.
"""

import argparse
import asyncio
import logging
import sys
import os
from pathlib import Path

# Ensure we can import from scraper/ when run from project root
sys.path.insert(0, str(Path(__file__).parent))

# Load env from project root .env (config.py does this too, but be explicit)
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from database import db
from scrapers.greenhouse import GreenhouseScraper
from scrapers.lever import LeverScraper
from scrapers.ashby import AshbyScraper
from scrapers.smartrecruiters import SmartRecruitersScraper
from scrapers.workable import WorkableScraper
from scrapers.recruitee import RecruiteeScraper
from scrapers.workday import WorkdayScraper

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("smoke")

SCRAPERS = {
    "greenhouse": GreenhouseScraper,
    "lever": LeverScraper,
    "ashby": AshbyScraper,
    "smartrecruiters": SmartRecruitersScraper,
    "workable": WorkableScraper,
    "recruitee": RecruiteeScraper,
    "workday": WorkdayScraper,
}


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", nargs="?", default="greenhouse", choices=list(SCRAPERS.keys()))
    parser.add_argument("--save", action="store_true", help="Actually save a small sample to DB")
    parser.add_argument("--max", type=int, default=50, help="Cap jobs fetched (sets MAX_JOBS_PER_SOURCE)")
    args = parser.parse_args()

    os.environ["MAX_JOBS_PER_SOURCE"] = str(args.max)

    print(f"\n=== Smoke test: {args.source} (max={args.max}, save={args.save}) ===\n")

    await db.connect()
    try:
        scraper_cls = SCRAPERS[args.source]
        scraper = scraper_cls(tiers=[1, 2, 3])

        jobs = await scraper.fetch_jobs()

        if not jobs:
            print("FAIL: scraper returned 0 jobs. Likely no companies seeded for this ATS, or all 404'd.")
            return 1

        with_id = [j for j in jobs if j.company_ats_id]
        without_id = [j for j in jobs if not j.company_ats_id]
        distinct_ids = {j.company_ats_id for j in with_id}

        print(f"\n--- Stats ---")
        print(f"  Total jobs fetched:        {len(jobs)}")
        print(f"  With company_ats_id:       {len(with_id)}")
        print(f"  Without company_ats_id:    {len(without_id)}")
        print(f"  Distinct company_ats_ids:  {len(distinct_ids)}")

        if without_id:
            print(f"\n  WARN: {len(without_id)} jobs missing company_ats_id (first 3):")
            for j in without_id[:3]:
                print(f"    - {j.company_name} | {j.external_id}")

        if not with_id:
            print("\nFAIL: no jobs got a company_ats_id. Threading is broken.")
            return 2

        sample = with_id[0]
        print(f"\n  Sample job:")
        print(f"    title:           {sample.title}")
        print(f"    company_name:    {sample.company_name}")
        print(f"    company_ats_id:  {sample.company_ats_id}")
        print(f"    source:          {sample.source}")
        print(f"    external_id:     {sample.external_id}")

        if args.save:
            to_save = with_id[:5]
            print(f"\n--- Saving {len(to_save)} jobs to DB to verify write path ---")
            added, updated = await db.save_jobs(to_save)
            print(f"  added={added}, updated={updated}")

            # Verify companyAtsId actually landed
            async with db.pool.acquire() as conn:
                rows = await conn.fetch(
                    'SELECT id, title, company, "companyAtsId" FROM job_listings '
                    'WHERE source = $1 AND "sourceId" = ANY($2::text[])',
                    to_save[0].source,
                    [j.external_id for j in to_save],
                )
            print(f"\n--- Verified rows in DB ({len(rows)}) ---")
            for r in rows:
                marker = "OK" if r["companyAtsId"] else "MISSING"
                print(f"  [{marker}] {r['company']} | companyAtsId={r['companyAtsId']}")

            missing_in_db = [r for r in rows if not r["companyAtsId"]]
            if missing_in_db:
                print(f"\nFAIL: {len(missing_in_db)} row(s) saved without companyAtsId. DB write path is broken.")
                return 3

        print("\nPASS\n")
        return 0
    finally:
        await db.disconnect()


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
