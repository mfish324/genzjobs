/**
 * SmartRecruiters ATS Scraper
 *
 * Fetches job listings from SmartRecruiters public API.
 * API: https://api.smartrecruiters.com/v1/companies/{companyId}/postings
 */

import {
  stripHtml,
  extractSalary,
  retryWithBackoff,
  generateSourceId,
} from './utils';
import type { ScrapedJobData } from './greenhouse';

// ==================== Types ====================

export interface SmartRecruitersJob {
  id: string;
  name: string;
  uuid: string;
  refNumber?: string;
  company: {
    identifier: string;
    name: string;
  };
  releasedDate: string;
  location: {
    city?: string;
    region?: string;
    country?: string;
    remote: boolean;
    hybrid?: boolean;
    fullLocation?: string;
  };
  industry?: {
    id: string;
    label: string;
  };
  department?: {
    id: string;
    label: string;
  };
  function?: {
    id: string;
    label: string;
  };
  typeOfEmployment?: {
    id: string;
    label: string;
  };
  experienceLevel?: {
    id: string;
    label: string;
  };
  ref: string;
}

export interface SmartRecruitersResponse {
  offset: number;
  limit: number;
  totalFound: number;
  content: SmartRecruitersJob[];
}

export interface SmartRecruitersJobDetail {
  id: string;
  name: string;
  jobAd: {
    sections: {
      jobDescription?: { text: string };
      qualifications?: { text: string };
      additionalInformation?: { text: string };
      companyDescription?: { text: string };
    };
  };
}

// ==================== Constants ====================

const SMARTRECRUITERS_API_BASE = 'https://api.smartrecruiters.com/v1/companies';
const RATE_LIMIT_DELAY_MS = 500; // 0.5s between requests - their API is fast
const PAGE_SIZE = 100;

// ==================== Scraper Functions ====================

/**
 * Fetch all jobs from a SmartRecruiters company
 */
export async function fetchSmartRecruitersJobs(
  slug: string,
  companyName: string
): Promise<ScrapedJobData[]> {
  const jobs: ScrapedJobData[] = [];
  let offset = 0;
  let totalFound = 0;

  do {
    const url = `${SMARTRECRUITERS_API_BASE}/${slug}/postings?limit=${PAGE_SIZE}&offset=${offset}`;

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
            throw new Error(`SmartRecruiters company not found: ${slug}`);
          }
          if (res.status === 429) {
            throw new Error('Rate limited by SmartRecruiters API');
          }
          throw new Error(`SmartRecruiters API error: ${res.status} ${res.statusText}`);
        }

        return res.json() as Promise<SmartRecruitersResponse>;
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      }
    );

    totalFound = response.totalFound;

    for (const job of response.content) {
      const scraped = parseSmartRecruitersJob(job, slug, companyName);
      if (scraped) {
        jobs.push(scraped);
      }
    }

    offset += PAGE_SIZE;
  } while (offset < totalFound);

  return jobs;
}

/**
 * Fetch job description from detail endpoint
 */
async function fetchJobDescription(companySlug: string, jobId: string): Promise<string | null> {
  try {
    const url = `${SMARTRECRUITERS_API_BASE}/${companySlug}/postings/${jobId}`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GenzJobs/1.0 (job aggregator)',
      },
    });

    if (!res.ok) return null;

    const detail = await res.json() as SmartRecruitersJobDetail;
    const sections = detail.jobAd?.sections || {};

    const parts = [
      sections.jobDescription?.text,
      sections.qualifications?.text,
      sections.additionalInformation?.text,
    ].filter(Boolean);

    return parts.map(p => stripHtml(p!)).join('\n\n');
  } catch {
    return null;
  }
}

/**
 * Parse a single SmartRecruiters job into our standard format
 */
function parseSmartRecruitersJob(
  job: SmartRecruitersJob,
  slug: string,
  companyName: string
): ScrapedJobData | null {
  // Build a basic description from available metadata
  // (Fetching full descriptions for each job is too slow for large companies)
  const descriptionParts = [
    `${job.name} at ${companyName}`,
    job.department?.label ? `Department: ${job.department.label}` : null,
    job.function?.label ? `Function: ${job.function.label}` : null,
    job.industry?.label ? `Industry: ${job.industry.label}` : null,
    job.experienceLevel?.label ? `Experience Level: ${job.experienceLevel.label}` : null,
    job.typeOfEmployment?.label ? `Employment Type: ${job.typeOfEmployment.label}` : null,
    job.location.fullLocation ? `Location: ${job.location.fullLocation}` : null,
    job.location.remote ? 'This is a remote position.' : null,
    job.location.hybrid ? 'This is a hybrid position.' : null,
  ].filter(Boolean);

  const description = descriptionParts.join('\n');

  // Build location string
  const location = job.location.fullLocation ||
    [job.location.city, job.location.region, job.location.country]
      .filter(Boolean)
      .join(', ') ||
    null;

  // Detect remote
  const remote = job.location.remote === true;

  // Extract salary from description
  const salaryInfo = extractSalary(description);

  // Parse job type
  const jobType = parseEmploymentType(job.typeOfEmployment?.label);

  // Build apply URL
  const applyUrl = `https://jobs.smartrecruiters.com/${slug}/${job.uuid}`;

  return {
    sourceId: generateSourceId('smartrecruiters', slug, job.id),
    source: 'smartrecruiters',
    title: job.name,
    company: companyName,
    location,
    remote,
    description,
    applyUrl,
    salaryMin: salaryInfo?.min || null,
    salaryMax: salaryInfo?.max || null,
    salaryCurrency: salaryInfo?.currency || null,
    salaryPeriod: salaryInfo?.period || null,
    jobType,
    department: job.department?.label || job.function?.label || null,
    postedAt: new Date(job.releasedDate),
  };
}

/**
 * Parse SmartRecruiters employment type into standardized job type
 */
function parseEmploymentType(label: string | undefined): string | null {
  if (!label) return null;

  const lower = label.toLowerCase();

  if (lower.includes('full-time') || lower.includes('full time') || lower === 'permanent') {
    return 'full-time';
  }
  if (lower.includes('part-time') || lower.includes('part time')) {
    return 'part-time';
  }
  if (lower.includes('contract') || lower.includes('contractor') || lower.includes('temporary')) {
    return 'contract';
  }
  if (lower.includes('intern')) {
    return 'internship';
  }

  return null;
}

/**
 * Map SmartRecruiters experience level to our classification
 * This can be used to supplement or override our classifier
 */
export function mapExperienceLevel(experienceLevel?: { id: string; label: string }): string | null {
  if (!experienceLevel) return null;

  const id = experienceLevel.id.toLowerCase();

  // SmartRecruiters experience level IDs
  if (id === 'entry_level' || id === 'internship' || id === 'not_applicable') {
    return 'ENTRY';
  }
  if (id === 'associate' || id === 'mid_level') {
    return 'MID';
  }
  if (id === 'mid_senior_level' || id === 'senior_level') {
    return 'SENIOR';
  }
  if (id === 'director' || id === 'executive' || id === 'vp_level') {
    return 'EXECUTIVE';
  }

  return null;
}

/**
 * Validate a SmartRecruiters company exists
 */
export async function validateSmartRecruitersCompany(slug: string): Promise<boolean> {
  try {
    const url = `${SMARTRECRUITERS_API_BASE}/${slug}/postings?limit=1`;
    const response = await fetch(url, {
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
 * Get rate limit delay for SmartRecruiters
 */
export function getSmartRecruitersRateLimitDelay(): number {
  return RATE_LIMIT_DELAY_MS;
}
