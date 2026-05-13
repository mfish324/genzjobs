# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Development
npm run dev          # Start Next.js dev server (Turbopack)
npm run build        # Build for production (runs prisma generate first)
npm run lint         # Run ESLint
npm test             # Run tests in watch mode
npm run test:run     # Run tests once

# Database
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema changes to database
npx prisma studio    # Open database GUI

# Scraper (Python service in /scraper)
cd scraper
python -m venv venv && venv\Scripts\activate  # Windows
pip install -r requirements.txt
python main.py       # Run scraper service
```

## Architecture Overview

This is a **multi-platform job board system** sharing a single database:
- **GenZ Jobs**: Entry-level positions, gamified UI (XP, quests, badges)
- **JobScroll** (planned): Mid-to-senior roles, passive browsing experience
- **RJRP** (planned): Verified employer jobs, eliminating ghost jobs

### Tech Stack
- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS + Radix UI
- **Auth**: NextAuth.js with JWT strategy (`src/lib/auth.ts`)
- **Database**: PostgreSQL (Neon serverless) via Prisma ORM
- **AI**: Anthropic Claude for job-candidate matching (`src/lib/ai.ts`)
- **Scrapers**: Python FastAPI service on Railway (runs every 4 hours)
- **Testing**: Vitest

### Project Structure
```
src/
├── app/
│   ├── (auth)/              # Login/register pages (no navbar)
│   ├── (main)/              # Main app with navbar layout
│   │   ├── jobs/            # Job search & details
│   │   ├── dashboard/       # User stats
│   │   ├── quests/          # Daily/weekly challenges
│   │   ├── rewards/         # XP redemption store
│   │   └── employer/        # Employer portal
│   └── api/
│       ├── admin/           # Admin endpoints (backfill, etc.)
│       ├── cron/geocode/    # Vercel cron for geocoding jobs
│       └── ...              # 32+ API routes
├── components/              # React components
└── lib/
    ├── prisma.ts            # Prisma client singleton
    ├── constants.ts         # XP values, job types, skills
    ├── classification/      # Job classification module
    │   └── classifyJob.ts   # Classifies jobs by experience level
    └── queries/             # Platform-specific query helpers
        └── jobQueries.ts    # getGenZJobs(), getJobScrollJobs(), etc.
scraper/                     # Python scraper service (Railway)
├── main.py                  # FastAPI app entry point
├── config.py                # Job sources, API keys, settings
├── companies.py             # Company slug registry for ATS scrapers
├── database.py              # Job persistence with classification
├── scheduler.py             # APScheduler cron (every 4 hours)
├── classification.py        # Python port of classification logic
├── models.py                # Pydantic models (ScrapedJob, etc.)
└── scrapers/
    ├── base.py              # BaseScraper (abstract)
    ├── ats_base.py          # ATSBaseScraper (multi-company iteration)
    ├── remotive.py          # Remotive API
    ├── usajobs.py           # USAJobs API
    ├── apprenticeship.py    # Apprenticeship.gov API
    ├── jsearch.py           # JSearch API
    ├── arbeitnow.py         # Arbeitnow API (disabled - European)
    ├── greenhouse.py        # Greenhouse ATS (60 companies)
    ├── lever.py             # Lever ATS (24 companies)
    ├── ashby.py             # Ashby ATS (18 companies)
    ├── smartrecruiters.py   # SmartRecruiters ATS (2 companies)
    ├── workday.py           # Workday ATS (15 companies)
    ├── workable.py          # Workable ATS (10 companies)
    └── recruitee.py         # Recruitee ATS (5 companies)
prisma/schema.prisma         # Database schema (20+ models)
scripts/seed-companies.ts    # Seed CompanyATS table (86 companies)
```

## Job Classification System

Jobs are classified by experience level for multi-platform targeting:

```typescript
import { classifyJob } from '@/lib/classification';

const result = classifyJob({
  title: 'Senior Software Engineer',
  description: 'Looking for 5+ years experience...',
  salaryMin: 150000,
  salaryMax: 180000,
});
// { experienceLevel: 'SENIOR', audienceTags: ['senior'], confidence: 0.85 }
```

**Classification signals (weighted):**
- Title keywords (10 pts): "intern", "senior", "VP", etc.
- Years parsing (8 pts): "5+ years", "entry-level", etc.
- Salary bands (5 pts): <$60k entry, $60-100k mid, $100-200k senior, >$200k exec
- Description signals (3 pts): "report to CEO", "no experience required", etc.

**Edge cases handled:**
- "Senior Living Coordinator" → NOT senior (blocked phrase)
- "Postdoctoral Trainee" → NOT executive (word boundary for "CTO")
- McDonald's "Shift Manager" → Entry (retail context)

### Platform Query Helpers

```typescript
import { getGenZJobs, getJobScrollJobs, getRjrpVerifiedJobs } from '@/lib/queries';

// GenZ Jobs - entry level
const { jobs } = await getGenZJobs({ remote: true });

// JobScroll - mid to senior
const { jobs } = await getJobScrollJobs({ location: 'San Francisco' });

// RJRP - verified employers only
const { jobs } = await getRjrpVerifiedJobs();
```

## Key Database Fields (JobListing)

```prisma
experienceLevel       ExperienceLevel?  // ENTRY, MID, SENIOR, EXECUTIVE
audienceTags          String[]          // ['genz', 'mid_career', 'senior', 'executive']
classificationConfidence Float?         // 0-1 confidence score
isRjrpVerified        Boolean           // Verified employer badge
companyAtsId          String?           // FK -> CompanyATS for ATS-sourced jobs
companyAts            CompanyATS?       // Relation; read .industryCategory, etc.
```

## Industry Category (CompanyATS)

`CompanyATS.industryCategory` is a nullable `IndustryCategory` enum. RJRP's HAS scorer reads it via `JobListing.companyAts.industryCategory` to pick a weight profile. Null → default profile.

Enum values: `TECHNOLOGY`, `FINANCE_AND_BANKING`, `HEALTHCARE`, `CONSULTING`, `AEROSPACE_AND_DEFENSE`, `GOVERNMENT`, `RETAIL_AND_ECOMMERCE`, `MEDIA_AND_ENTERTAINMENT`, `OTHER`.

Tag rows directly in Prisma Studio or via a seed-data update. We do not infer industry — untagged rows stay null and use default scoring.

## Key Data Flows

**XP System**: Users earn XP for applications, quests, events, daily spin. All XP changes use atomic transactions:
```typescript
await prisma.$transaction([
  prisma.application.create({...}),
  prisma.user.update({ xp: { increment: amount } }),
  prisma.xpTransaction.create({...})
])
```

**Job Aggregation**: External APIs → Python scraper (classifies) → PostgreSQL → Next.js API → Frontend. Jobs deduplicated by `@@unique([source, sourceId])`.

**Authentication**: NextAuth JWT sessions. Protected routes check `session?.user?.id`.

## API Patterns

Protected endpoints:
```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

Admin endpoints (e.g., `/api/admin/backfill-classification`):
```typescript
// Requires x-admin-key header matching ADMIN_API_KEY env var
```

## Scraper Architecture

All scrapers run as a single Python FastAPI service on Railway (every 4 hours).

**Job board scrapers**: Remotive, USAJobs, Apprenticeship.gov, JSearch — pull from public job APIs.

**ATS scrapers**: Greenhouse, Lever, Ashby, SmartRecruiters, Workday, Workable, Recruitee — pull directly from 134 company career pages. Company slugs defined in `scraper/companies.py` and seeded to the `company_ats` DB table via `scripts/seed-companies.ts`.

**ATS scraper pattern**: All ATS scrapers extend `ATSBaseScraper` (which extends `BaseScraper`). The base class iterates over company slugs, calls `fetch_company_jobs()` per company with per-company error isolation, and auto-classifies all jobs after fetching.

**Key endpoints** (FastAPI on Railway):
- `POST /scrape` — trigger all scrapers
- `POST /scrape/{source}` — trigger one scraper (e.g., `/scrape/greenhouse`)
- `GET /status` — scheduler status
- `GET /health` — health check

## Deployment

- **Frontend**: Vercel (auto-deploys from git)
- **Database**: Neon PostgreSQL (connection URLs in env)
- **Scrapers**: Railway (Python FastAPI, scheduled every 4 hours, auto-classifies new jobs)
- **Vercel crons**: Geocoding only (`/api/cron/geocode` daily at 8am UTC)

## Priority Tier System

Every `CompanyATS` row carries a `priorityTier` field that controls scrape cadence and order:

| Tier | Meaning   | Default cadence            | Use case |
|------|-----------|----------------------------|----------|
| 1    | Priority  | `TIER1_SCRAPE_INTERVAL_MINUTES` (60m) | Tech employers core audience cares about |
| 2    | Standard  | `SCRAPE_INTERVAL_MINUTES` (240m / 4h) | Current default — no behavior change |
| 3    | Low       | `TIER3_SCRAPE_INTERVAL_MINUTES` (1440m / 24h) | On platform but not in focus |

New `CompanyATS` rows default to tier 2. Tier 1 rows are scraped first within their run (rows are returned ordered by `priorityTier ASC`).

### Scheduler behavior

`scraper/scheduler.py` runs **three independent jobs**:
- `scrape_tier1` — every 60m, ATS scrapers with `tiers=[1]`
- `scrape_standard` — every 240m, ATS scrapers with `tiers=[2]` **plus** non-ATS API scrapers (Remotive, JSearch, USAJobs, Apprenticeship, Arbeitnow)
- `scrape_tier3` — every 1440m, ATS scrapers with `tiers=[3]`

Manual `POST /scrape` still scrapes everything (all tiers, all sources) for backwards compat.

### Managing tiers

ATS scrapers read companies from the `CompanyATS` table at scrape time (not from hardcoded lists), so tier changes take effect on the next run without redeploying Railway.

```bash
# Single company
npx tsx scripts/set-employer-tier.ts --tier 1 --name "Anthropic"

# Bulk (comma-separated)
npx tsx scripts/set-employer-tier.ts --tier 2 --names "Anthropic,OpenAI,Stripe"

# Bulk (text file, one name per line, # for comments)
npx tsx scripts/set-employer-tier.ts --tier 1 --file path/to/list.txt

# Direct CompanyATS.id
npx tsx scripts/set-employer-tier.ts --tier 3 --id <cuid>

# Bulk-promote to Tier 1 (writes unmatched names to scripts/missing-tier1-companies.txt)
npx tsx scripts/import-tier1-employers.ts --file path/to/tier1.txt
```

If `import-tier1-employers` reports missing names, add their ATS platform + slug to `scripts/seed-companies.ts`, run `npx tsx scripts/seed-companies.ts`, then re-run the import. Stub rows are **not** created — without a slug they can't be scraped.

### Admin / inspection

Use Prisma Studio for ad-hoc viewing and editing:

```bash
npx prisma studio
```

The `CompanyATS` table exposes `priorityTier` and `industryCategory` as inline-editable columns.

### Backfilling companyAtsId on JobListing

ATS scrapers now stamp `JobListing.companyAtsId` at insert time so downstream consumers (RJRP HAS scorer) can read company-level signals via the relation. To backfill existing rows:

```bash
# Dry run — prints per-source resolution stats
npx tsx scripts/backfill-company-ats-id.ts

# Apply
npx tsx scripts/backfill-company-ats-id.ts --apply
```

Resolution: slug parsed from `sourceId` for Greenhouse/Ashby/SmartRecruiters/Workday, falling back to case-insensitive `company` name match. Lever/Workable/Recruitee resolve by name only (no slug in sourceId). Idempotent — only touches rows with `companyAtsId IS NULL`.

### Important: reseed before deploying the refactor

The old `scraper/companies.py` used hardcoded Python lists. The new version reads from `CompanyATS` directly. If the DB and the old hardcoded lists have diverged (e.g., a company was added to `companies.py` but never to `seed-companies.ts`), the scraper will silently stop scraping it. Run `npx tsx scripts/seed-companies.ts` once before deploying this change to make sure the DB has every entry the hardcoded lists had.

## Important Notes

- **React 18** (not 19): `React.use()` does not exist. Use `useParams()` for client component route params.
- **Vercel Hobby plan**: Crons must be once-per-day max. Multi-per-day cron schedules will silently block ALL deployments.
- **Vercel auto-deploy**: Can break silently. If deploys stop, check `npx vercel --prod` for errors. Cron schedule issues are a common cause.
- **ATS scraper sourceId format**: Must match legacy format `{source}_{slug}_{id}` for Greenhouse/Ashby/SmartRecruiters/Workday. Lever/Workable/Recruitee use `{source}_{id}`. Mismatch causes silent save failures.
- **Railway scraper URL**: `https://genzjobs-production.up.railway.app`
