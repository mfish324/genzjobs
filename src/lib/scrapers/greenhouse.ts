/**
 * Greenhouse ATS Scraper
 *
 * Fetches job listings from Greenhouse boards API.
 * API Docs: https://developers.greenhouse.io/job-board.html
 */

import {
  stripHtml,
  extractSalary,
  detectRemote,
  delay,
  retryWithBackoff,
  generateSourceId,
  isValidUrl,
} from './utils';

// ==================== Types ====================

export interface GreenhouseJob {
  id: number;
  title: string;
  updated_at: string;
  absolute_url: string;
  internal_job_id: number;
  location: {
    name: string;
  };
  metadata?: Array<{
    id: number;
    name: string;
    value: string | string[] | null;
    value_type: string;
  }>;
  departments: Array<{
    id: number;
    name: string;
    parent_id: number | null;
    child_ids: number[];
  }>;
  offices: Array<{
    id: number;
    name: string;
    location: string | null;
    parent_id: number | null;
    child_ids: number[];
  }>;
  content?: string; // HTML description (only with content=true)
}

export interface GreenhouseResponse {
  jobs: GreenhouseJob[];
  meta?: {
    total: number;
  };
}

export interface ScrapedJobData {
  sourceId: string;
  source: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  description: string;
  applyUrl: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  jobType: string | null;
  department: string | null;
  postedAt: Date;
}

// ==================== Constants ====================

const GREENHOUSE_API_BASE = 'https://boards-api.greenhouse.io/v1/boards';
const RATE_LIMIT_DELAY_MS = 1500; // 1.5s between requests

// ==================== Scraper Functions ====================

/**
 * Fetch all jobs from a Greenhouse board
 */
export async function fetchGreenhouseJobs(
  slug: string,
  companyName: string
): Promise<ScrapedJobData[]> {
  const url = `${GREENHOUSE_API_BASE}/${slug}/jobs?content=true`;

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
          throw new Error(`Greenhouse board not found: ${slug}`);
        }
        if (res.status === 429) {
          throw new Error('Rate limited by Greenhouse API');
        }
        throw new Error(`Greenhouse API error: ${res.status} ${res.statusText}`);
      }

      return res.json() as Promise<GreenhouseResponse>;
    },
    {
      maxRetries: 3,
      initialDelayMs: 2000,
      maxDelayMs: 60000,
    }
  );

  const jobs: ScrapedJobData[] = [];

  for (const job of response.jobs) {
    const scraped = parseGreenhouseJob(job, slug, companyName);
    if (scraped) {
      jobs.push(scraped);
    }
  }

  return jobs;
}

/**
 * Parse a single Greenhouse job into our standard format
 */
function parseGreenhouseJob(
  job: GreenhouseJob,
  slug: string,
  companyName: string
): ScrapedJobData | null {
  // Skip jobs without content
  if (!job.content) {
    return null;
  }

  const description = stripHtml(job.content);
  const location = job.location?.name || null;

  // Extract salary from description
  const salaryInfo = extractSalary(job.content);

  // Detect remote from location
  const remote = detectRemote(location || '', getMetadataValue(job, 'Employment Type'));

  // Get department
  const department = job.departments?.[0]?.name || null;

  // Parse job type from metadata
  const employmentType = getMetadataValue(job, 'Employment Type');
  const jobType = parseJobType(employmentType);

  return {
    sourceId: generateSourceId('greenhouse', slug, job.id),
    source: 'greenhouse',
    title: job.title,
    company: companyName,
    location,
    remote,
    description,
    applyUrl: job.absolute_url,
    salaryMin: salaryInfo?.min || null,
    salaryMax: salaryInfo?.max || null,
    salaryCurrency: salaryInfo?.currency || null,
    salaryPeriod: salaryInfo?.period || null,
    jobType,
    department,
    postedAt: new Date(job.updated_at),
  };
}

/**
 * Get metadata value from Greenhouse job
 */
function getMetadataValue(job: GreenhouseJob, name: string): string | null {
  if (!job.metadata) return null;

  const meta = job.metadata.find(
    m => m.name.toLowerCase() === name.toLowerCase()
  );

  if (!meta || !meta.value) return null;

  if (Array.isArray(meta.value)) {
    return meta.value[0] || null;
  }

  return meta.value;
}

/**
 * Parse employment type into standardized job type
 */
function parseJobType(employmentType: string | null): string | null {
  if (!employmentType) return null;

  const lower = employmentType.toLowerCase();

  if (lower.includes('full-time') || lower.includes('full time')) return 'full-time';
  if (lower.includes('part-time') || lower.includes('part time')) return 'part-time';
  if (lower.includes('contract')) return 'contract';
  if (lower.includes('intern')) return 'internship';
  if (lower.includes('temp')) return 'contract';

  return null;
}

/**
 * Validate a Greenhouse board exists
 */
export async function validateGreenhouseBoard(slug: string): Promise<boolean> {
  try {
    const url = `${GREENHOUSE_API_BASE}/${slug}`;
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
 * Get rate limit delay for Greenhouse
 */
export function getGreenhouseRateLimitDelay(): number {
  return RATE_LIMIT_DELAY_MS;
}
