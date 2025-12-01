import logging
import ssl
from typing import List, Tuple
from datetime import datetime
import asyncpg
from contextlib import asynccontextmanager

from config import DATABASE_URL
from models import ScrapedJob

logger = logging.getLogger(__name__)


class Database:
    """Database handler for storing scraped jobs"""

    def __init__(self):
        self.pool: asyncpg.Pool | None = None

    async def connect(self):
        """Create database connection pool"""
        try:
            # Create SSL context for Neon/cloud databases
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

            self.pool = await asyncpg.create_pool(
                DATABASE_URL,
                min_size=2,
                max_size=10,
                ssl=ssl_context,
            )
            logger.info("Database connection pool created")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise

    async def disconnect(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")

    async def is_connected(self) -> bool:
        """Check if database is connected"""
        if not self.pool:
            return False
        try:
            async with self.pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            return True
        except Exception:
            return False

    async def save_jobs(self, jobs: List[ScrapedJob]) -> Tuple[int, int]:
        """
        Save scraped jobs to database.
        Returns tuple of (added_count, updated_count)
        """
        if not self.pool or not jobs:
            return 0, 0

        added = 0
        updated = 0

        async with self.pool.acquire() as conn:
            for job in jobs:
                try:
                    # Check if job already exists by source + sourceId
                    existing = await conn.fetchval(
                        'SELECT id FROM "job_listings" WHERE source = $1 AND "sourceId" = $2',
                        job.source,
                        job.external_id
                    )

                    if existing:
                        # Update existing job
                        await conn.execute(
                            '''
                            UPDATE "job_listings"
                            SET title = $2,
                                company = $3,
                                location = $4,
                                "jobType" = $5,
                                description = $6,
                                "salaryMin" = $7,
                                "salaryMax" = $8,
                                skills = $9,
                                remote = $10,
                                "applyUrl" = $11,
                                "updatedAt" = $12,
                                category = $14
                            WHERE source = $1 AND "sourceId" = $13
                            ''',
                            job.source,
                            job.title,
                            job.company_name,
                            job.location,
                            job.job_type,
                            job.description,
                            job.salary_min,
                            job.salary_max,
                            job.skills,
                            job.remote,
                            job.apply_url,
                            datetime.utcnow(),
                            job.external_id,
                            job.category.value if hasattr(job.category, 'value') else str(job.category),
                        )
                        updated += 1
                    else:
                        # Insert new job
                        await conn.execute(
                            '''
                            INSERT INTO "job_listings" (
                                id, "sourceId", source, title, company, "companyLogo",
                                location, "jobType", "experienceLevel", category, description,
                                "salaryMin", "salaryMax", "salaryCurrency", skills,
                                remote, "applyUrl", "postedAt", "createdAt", "updatedAt"
                            ) VALUES (
                                gen_random_uuid(), $1, $2, $3, $4, $5,
                                $6, $7, $8, $9, $10,
                                $11, $12, $13, $14,
                                $15, $16, $17, $18, $19
                            )
                            ''',
                            job.external_id,
                            job.source,
                            job.title,
                            job.company_name,
                            job.company_logo,
                            job.location,
                            job.job_type,
                            job.experience_level,
                            job.category.value if hasattr(job.category, 'value') else str(job.category),
                            job.description,
                            job.salary_min,
                            job.salary_max,
                            job.salary_currency or "USD",
                            job.skills,
                            job.remote,
                            job.apply_url,
                            job.posted_at or datetime.utcnow(),
                            datetime.utcnow(),
                            datetime.utcnow(),
                        )
                        added += 1

                except Exception as e:
                    logger.error(f"Failed to save job {job.external_id}: {e}")
                    continue

        logger.info(f"Saved jobs: {added} added, {updated} updated")
        return added, updated

    async def get_job_count(self) -> int:
        """Get total number of jobs in database"""
        if not self.pool:
            return 0

        async with self.pool.acquire() as conn:
            count = await conn.fetchval('SELECT COUNT(*) FROM "job_listings"')
            return count or 0

    async def cleanup_old_jobs(self, days: int = 30) -> int:
        """Remove jobs older than specified days"""
        if not self.pool:
            return 0

        async with self.pool.acquire() as conn:
            result = await conn.execute(
                '''
                DELETE FROM "job_listings"
                WHERE "createdAt" < NOW() - INTERVAL '$1 days'
                AND "sourceId" IS NOT NULL
                ''',
                days
            )
            # Extract count from result
            count = int(result.split()[-1]) if result else 0
            logger.info(f"Cleaned up {count} old jobs")
            return count


# Singleton database instance
db = Database()
