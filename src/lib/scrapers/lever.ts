/**
 * Lever ATS Scraper
 *
 * Fetches job listings from Lever postings API.
 * API: https://api.lever.co/v0/postings/{company}?mode=json
 */

import {
  stripHtml,
  extractSalary,
  detectRemote,
  retryWithBackoff,
  generateSourceId,
} from './utils';
import type { ScrapedJobData } from './greenhouse';

// ==================== Types ====================

export interface LeverJob {
  id: string;
  text: string; // Job title
  hostedUrl: string;
  applyUrl: string;
  createdAt: number; // Unix timestamp in ms
  categories: {
    team?: string;
    department?: string;
    location?: string;
    commitment?: string; // full-time, part-time, etc.
    level?: string;
    workplaceType?: string; // on-site, remote, hybrid
  };
  description?: string; // Plain text
  descriptionPlain?: string;
  lists?: Array<{
    text: string;
    content: string; // HTML content
  }>;
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
    interval: string; // "per-year-salary", "per-hour-wage"
  };
  workplaceType?: string; // "on-site", "remote", "hybrid"
}

// ==================== Constants ====================

const LEVER_API_BASE = 'https://api.lever.co/v0/postings';
const RATE_LIMIT_DELAY_MS = 2500; // 2.5s between requests

// ==================== Scraper Functions ====================

/**
 * Fetch all jobs from a Lever board
 */
export async function fetchLeverJobs(
  slug: string,
  companyName: string
): Promise<ScrapedJobData[]> {
  const url = `${LEVER_API_BASE}/${slug}?mode=json`;

  const response = await retryWithBackoff(
    async () => {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GenzJobs/1.0 (job aggregator)',
        },
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`Lever board not found: ${slug}`);
        }
        if (res.status === 429) {
          throw new Error('Rate limited by Lever API');
        }
        throw new Error(`Lever API error: ${res.status} ${res.statusText}`);
      }

      return res.json() as Promise<LeverJob[]>;
    },
    {
      maxRetries: 3,
      initialDelayMs: 3000,
      maxDelayMs: 60000,
    }
  );

  const jobs: ScrapedJobData[] = [];

  for (const job of response) {
    const scraped = parseLeverJob(job, slug, companyName);
    if (scraped) {
      jobs.push(scraped);
    }
  }

  return jobs;
}

/**
 * Parse a single Lever job into our standard format
 */
function parseLeverJob(
  job: LeverJob,
  slug: string,
  companyName: string
): ScrapedJobData | null {
  // Build description from available fields
  const descriptionParts: string[] = [];

  if (job.description) {
    descriptionParts.push(job.description);
  } else if (job.descriptionPlain) {
    descriptionParts.push(job.descriptionPlain);
  }

  // Add lists content (requirements, responsibilities, etc.)
  if (job.lists) {
    for (const list of job.lists) {
      if (list.text) {
        descriptionParts.push(`\n${list.text}:`);
      }
      if (list.content) {
        descriptionParts.push(stripHtml(list.content));
      }
    }
  }

  const description = descriptionParts.join('\n').trim();

  // Skip jobs without description
  if (!description) {
    return null;
  }

  const location = job.categories?.location || null;

  // Get salary from native field or extract from description
  let salaryMin: number | null = null;
  let salaryMax: number | null = null;
  let salaryCurrency: string | null = null;
  let salaryPeriod: string | null = null;

  if (job.salaryRange) {
    salaryMin = job.salaryRange.min;
    salaryMax = job.salaryRange.max;
    salaryCurrency = job.salaryRange.currency || 'USD';
    salaryPeriod = job.salaryRange.interval?.includes('hour') ? 'hourly' : 'yearly';
  } else {
    // Try to extract from description
    const extracted = extractSalary(description);
    if (extracted) {
      salaryMin = extracted.min;
      salaryMax = extracted.max;
      salaryCurrency = extracted.currency;
      salaryPeriod = extracted.period;
    }
  }

  // Detect remote from workplaceType (most reliable) or location
  const workplaceType = job.workplaceType || job.categories?.workplaceType;
  const remote = detectRemote(location || '', workplaceType);

  // Parse job type from commitment
  const jobType = parseCommitment(job.categories?.commitment);

  return {
    sourceId: generateSourceId('lever', slug, job.id),
    source: 'lever',
    title: job.text,
    company: companyName,
    location,
    remote,
    description,
    applyUrl: job.hostedUrl || job.applyUrl,
    salaryMin,
    salaryMax,
    salaryCurrency,
    salaryPeriod,
    jobType,
    department: job.categories?.team || job.categories?.department || null,
    postedAt: new Date(job.createdAt),
  };
}

/**
 * Parse Lever commitment field into standardized job type
 */
function parseCommitment(commitment: string | undefined): string | null {
  if (!commitment) return null;

  const lower = commitment.toLowerCase();

  if (lower.includes('full-time') || lower.includes('full time') || lower === 'full') {
    return 'full-time';
  }
  if (lower.includes('part-time') || lower.includes('part time') || lower === 'part') {
    return 'part-time';
  }
  if (lower.includes('contract') || lower.includes('contractor')) {
    return 'contract';
  }
  if (lower.includes('intern')) {
    return 'internship';
  }
  if (lower.includes('temporary') || lower.includes('temp')) {
    return 'contract';
  }

  return null;
}

/**
 * Validate a Lever board exists
 */
export async function validateLeverBoard(slug: string): Promise<boolean> {
  try {
    const url = `${LEVER_API_BASE}/${slug}?mode=json`;
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'GenzJobs/1.0 (job aggregator)',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get rate limit delay for Lever
 */
export function getLeverRateLimitDelay(): number {
  return RATE_LIMIT_DELAY_MS;
}

// Re-export ScrapedJobData for convenience
export type { ScrapedJobData };
