import logging
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from config import API_HOST, API_PORT, API_KEY, JOB_SOURCES
from database import db
from scheduler import scraper_scheduler
from models import HealthCheck, ScraperStatus, ScrapeResult

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting GenZJobs Scraper Service")
    await db.connect()
    scraper_scheduler.start()

    # Run initial scrape in background
    logger.info("Scheduling initial scrape")

    yield

    # Shutdown
    logger.info("Shutting down GenZJobs Scraper Service")
    scraper_scheduler.stop()
    await db.disconnect()


app = FastAPI(
    title="GenZJobs Job Scraper",
    description="Job scraping service for GenZJobs platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_api_key(x_api_key: Optional[str] = Header(None)) -> bool:
    """Verify API key if configured"""
    if not API_KEY:
        return True
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True


@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint"""
    db_connected = await db.is_connected()

    return HealthCheck(
        status="healthy" if db_connected else "degraded",
        database_connected=db_connected,
        scheduler_running=scraper_scheduler.scheduler.running,
    )


@app.get("/status", response_model=ScraperStatus)
async def get_status(authorized: bool = Depends(verify_api_key)):
    """Get current scraper status"""
    total_jobs = await db.get_job_count()

    return ScraperStatus(
        is_running=scraper_scheduler.is_running,
        last_run=scraper_scheduler.last_run,
        next_run=scraper_scheduler.get_next_run(),
        total_jobs=total_jobs,
        sources=list(JOB_SOURCES.keys()),
    )


@app.post("/scrape", response_model=List[ScrapeResult])
async def trigger_scrape(
    background_tasks: BackgroundTasks,
    authorized: bool = Depends(verify_api_key),
):
    """Trigger a scrape of all sources"""
    if scraper_scheduler.is_running:
        raise HTTPException(status_code=409, detail="Scrape already in progress")

    # Run in background
    results = await scraper_scheduler.run_scrapers()
    return results


@app.post("/scrape/{source}", response_model=ScrapeResult)
async def trigger_single_scrape(
    source: str,
    authorized: bool = Depends(verify_api_key),
):
    """Trigger a scrape of a single source"""
    if source not in JOB_SOURCES:
        raise HTTPException(status_code=404, detail=f"Unknown source: {source}")

    if scraper_scheduler.is_running:
        raise HTTPException(status_code=409, detail="Scrape already in progress")

    result = await scraper_scheduler.run_single_scraper(source)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to run scraper")

    return result


@app.get("/sources")
async def list_sources(authorized: bool = Depends(verify_api_key)):
    """List all available job sources"""
    return {
        "sources": [
            {
                "name": name,
                "enabled": config.get("enabled", False),
                "type": config.get("type", "unknown"),
            }
            for name, config in JOB_SOURCES.items()
        ]
    }


@app.get("/results", response_model=List[ScrapeResult])
async def get_last_results(authorized: bool = Depends(verify_api_key)):
    """Get results from the last scrape run"""
    return scraper_scheduler.last_results


@app.post("/cleanup")
async def cleanup_old_jobs(
    days: int = 30,
    authorized: bool = Depends(verify_api_key),
):
    """Remove jobs older than specified days"""
    count = await db.cleanup_old_jobs(days)
    return {"deleted": count, "days": days}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=API_HOST,
        port=API_PORT,
        reload=True,
    )
