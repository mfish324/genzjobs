"""
One-shot INSERT test: build a synthetic ScrapedJob with company_ats_id set
and posted_at=None (to side-step a pre-existing TZ bug in greenhouse.py),
save it via db.save_jobs(), read it back, verify companyAtsId persisted.

Cleans up after itself by deleting the test row.
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from database import db
from models import ScrapedJob


TEST_SOURCE_ID = "smoke_test_insert_companyatsid_001"


async def main():
    await db.connect()
    try:
        # Grab a real CompanyATS.id to use as the FK
        async with db.pool.acquire() as conn:
            company_ats_id = await conn.fetchval(
                'SELECT id FROM company_ats WHERE "isActive" = true LIMIT 1'
            )
        if not company_ats_id:
            print("FAIL: no active CompanyATS rows. Seed-companies hasn't run.")
            return 1

        print(f"Using CompanyATS.id = {company_ats_id}")

        # Make sure no prior test row exists
        async with db.pool.acquire() as conn:
            await conn.execute(
                'DELETE FROM job_listings WHERE source = $1 AND "sourceId" = $2',
                "smoke", TEST_SOURCE_ID,
            )

        job = ScrapedJob(
            external_id=TEST_SOURCE_ID,
            source="smoke",
            title="Smoke Test Engineer",
            company_name="Smoke Test Co",
            description="This is a test row. Deleted after verification.",
            apply_url="https://example.com/smoke",
            posted_at=None,
            company_ats_id=company_ats_id,
        )

        added, updated = await db.save_jobs([job])
        print(f"save_jobs: added={added}, updated={updated}")

        async with db.pool.acquire() as conn:
            row = await conn.fetchrow(
                'SELECT id, title, "companyAtsId" FROM job_listings '
                'WHERE source = $1 AND "sourceId" = $2',
                "smoke", TEST_SOURCE_ID,
            )

        if not row:
            print("FAIL: row not found in DB after save.")
            return 2

        print(f"DB row: id={row['id']}, title={row['title']!r}, companyAtsId={row['companyAtsId']}")

        if row["companyAtsId"] != company_ats_id:
            print(f"FAIL: companyAtsId mismatch. expected={company_ats_id}, got={row['companyAtsId']}")
            return 3

        # Cleanup
        async with db.pool.acquire() as conn:
            await conn.execute(
                'DELETE FROM job_listings WHERE source = $1 AND "sourceId" = $2',
                "smoke", TEST_SOURCE_ID,
            )
        print("Cleaned up test row.")
        print("\nPASS: INSERT path writes companyAtsId correctly.")
        return 0
    finally:
        await db.disconnect()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
