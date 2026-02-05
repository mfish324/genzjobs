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
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Radix UI
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
│       └── ...              # 32+ API routes
├── components/              # React components
└── lib/
    ├── prisma.ts            # Prisma client singleton
    ├── constants.ts         # XP values, job types, skills
    ├── classification/      # Job classification module
    │   └── classifyJob.ts   # Classifies jobs by experience level
    └── queries/             # Platform-specific query helpers
        └── jobQueries.ts    # getGenZJobs(), getJobScrollJobs(), etc.
scraper/
├── classification.py        # Python port of classification logic
├── database.py              # Job persistence with classification
└── scrapers/                # Individual scraper implementations
prisma/schema.prisma         # Database schema (20+ models)
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
```

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

## Deployment

- **Frontend**: Vercel (auto-deploys from git)
- **Database**: Neon PostgreSQL (connection URLs in env)
- **Scrapers**: Railway (scheduled every 4 hours, auto-classifies new jobs)
