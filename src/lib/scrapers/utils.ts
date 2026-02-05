/**
 * Scraper Utility Functions
 *
 * Shared utilities for ATS platform scrapers.
 */

// ==================== Types ====================

export interface SalaryInfo {
  min: number | null;
  max: number | null;
  currency: string;
  period: 'yearly' | 'hourly';
}

// ==================== HTML Processing ====================

/**
 * Strip HTML tags and decode common entities from text
 */
export function stripHtml(html: string): string {
  if (!html) return '';

  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, ' ');

  // Decode common HTML entities
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&mdash;': '—',
    '&ndash;': '–',
    '&bull;': '\u2022',
    '&hellip;': '\u2026',
    '&rsquo;': '\u2019',
    '&lsquo;': '\u2018',
    '&rdquo;': '\u201D',
    '&ldquo;': '\u201C',
  };

  for (const [entity, char] of Object.entries(entities)) {
    text = text.replace(new RegExp(entity, 'g'), char);
  }

  // Handle numeric entities
  text = text.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

// ==================== Salary Extraction ====================

/**
 * Extract salary information from job description text
 */
export function extractSalary(text: string): SalaryInfo | null {
  if (!text) return null;

  const lowerText = text.toLowerCase();

  // Detect hourly vs yearly
  const isHourly = /\$\s*\d+(?:\.\d{2})?\s*(?:\/|-|per)\s*(?:hr|hour)/i.test(text) ||
                   /hourly\s*(?:rate|wage|pay)/i.test(text);

  // Pattern: $X - $Y (with k suffix)
  const rangeWithK = text.match(/\$\s*([\d,]+)k?\s*[-–to]+\s*\$?\s*([\d,]+)k/i);
  if (rangeWithK) {
    const min = parseFloat(rangeWithK[1].replace(/,/g, '')) * (rangeWithK[0].toLowerCase().includes('k') && !rangeWithK[1].includes(',') && parseInt(rangeWithK[1]) < 1000 ? 1000 : 1);
    const max = parseFloat(rangeWithK[2].replace(/,/g, '')) * 1000;
    return {
      min: Math.round(min),
      max: Math.round(max),
      currency: 'USD',
      period: isHourly ? 'hourly' : 'yearly',
    };
  }

  // Pattern: $X,XXX - $Y,YYY (full numbers)
  const rangeMatch = text.match(/\$\s*([\d,]+(?:\.\d{2})?)\s*[-–to]+\s*\$?\s*([\d,]+(?:\.\d{2})?)/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1].replace(/,/g, ''));
    const max = parseFloat(rangeMatch[2].replace(/,/g, ''));

    // Sanity check: hourly rates vs annual salaries
    if (isHourly || (min < 200 && max < 200)) {
      return {
        min: Math.round(min),
        max: Math.round(max),
        currency: 'USD',
        period: 'hourly',
      };
    }

    return {
      min: Math.round(min),
      max: Math.round(max),
      currency: 'USD',
      period: 'yearly',
    };
  }

  // Pattern: $XK or $X,XXX single value (estimated range)
  const singleK = text.match(/\$\s*([\d]+)k\b/i);
  if (singleK) {
    const value = parseInt(singleK[1]) * 1000;
    return {
      min: Math.round(value * 0.9),
      max: Math.round(value * 1.1),
      currency: 'USD',
      period: 'yearly',
    };
  }

  // Pattern: $XXX,XXX single value
  const singleFull = text.match(/\$\s*([\d,]+)\s*(?:per\s*(?:year|annum)|annually|\/\s*yr)/i);
  if (singleFull) {
    const value = parseFloat(singleFull[1].replace(/,/g, ''));
    if (value > 1000) {
      return {
        min: Math.round(value * 0.9),
        max: Math.round(value * 1.1),
        currency: 'USD',
        period: 'yearly',
      };
    }
  }

  return null;
}

// ==================== Remote Detection ====================

/**
 * Detect if a job is remote based on location and workplace type
 */
export function detectRemote(location: string, workplaceType?: string): boolean {
  if (!location && !workplaceType) return false;

  const lowerLocation = (location || '').toLowerCase();
  const lowerWorkplace = (workplaceType || '').toLowerCase();

  // Explicit remote indicators
  const remoteKeywords = [
    'remote',
    'work from home',
    'wfh',
    'distributed',
    'anywhere',
    'virtual',
    'telecommute',
  ];

  // Check workplace type first (most reliable)
  if (lowerWorkplace) {
    if (remoteKeywords.some(kw => lowerWorkplace.includes(kw))) return true;
    if (lowerWorkplace === 'onsite' || lowerWorkplace === 'on-site') return false;
  }

  // Check location
  if (lowerLocation) {
    // "Remote" as the only or primary location
    if (/^remote\b/i.test(location.trim())) return true;
    if (remoteKeywords.some(kw => lowerLocation.includes(kw))) return true;

    // "Hybrid" is not fully remote
    if (lowerLocation.includes('hybrid')) return false;
  }

  return false;
}

// ==================== Rate Limiting ====================

/**
 * Delay for a specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 60000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | null = null;
  let currentDelay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        await delay(currentDelay);
        currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs);
      }
    }
  }

  throw lastError;
}

// ==================== Source ID Generation ====================

/**
 * Generate a unique source ID for a job
 */
export function generateSourceId(platform: string, slug: string, jobId: string | number): string {
  return `${platform.toLowerCase()}_${slug}_${jobId}`;
}

// ==================== Validation ====================

/**
 * Check if a URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize company name for consistency
 */
export function normalizeCompanyName(name: string): string {
  return name
    .trim()
    .replace(/,?\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company|Co\.?)$/i, '')
    .trim();
}
