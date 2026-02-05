import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchGreenhouseJobs, validateGreenhouseBoard } from '../greenhouse';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('fetchGreenhouseJobs', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses Greenhouse API response correctly', async () => {
    const mockResponse = {
      jobs: [
        {
          id: 12345,
          title: 'Software Engineer',
          updated_at: '2024-01-15T10:00:00Z',
          absolute_url: 'https://boards.greenhouse.io/stripe/jobs/12345',
          internal_job_id: 1001,
          location: { name: 'San Francisco, CA' },
          departments: [{ id: 1, name: 'Engineering', parent_id: null, child_ids: [] }],
          offices: [],
          content: '<p>We are looking for a Software Engineer with 3+ years experience.</p><p>Salary: $120k - $180k</p>',
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const jobs = await fetchGreenhouseJobs('stripe', 'Stripe');

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      sourceId: 'greenhouse_stripe_12345',
      source: 'greenhouse',
      title: 'Software Engineer',
      company: 'Stripe',
      location: 'San Francisco, CA',
      remote: false,
    });
    expect(jobs[0].description).toContain('Software Engineer');
    expect(jobs[0].salaryMin).toBe(120000);
    expect(jobs[0].salaryMax).toBe(180000);
  });

  it('detects remote jobs', async () => {
    const mockResponse = {
      jobs: [
        {
          id: 12346,
          title: 'Remote Engineer',
          updated_at: '2024-01-15T10:00:00Z',
          absolute_url: 'https://boards.greenhouse.io/stripe/jobs/12346',
          internal_job_id: 1002,
          location: { name: 'Remote - US' },
          departments: [],
          offices: [],
          content: '<p>Fully remote position.</p>',
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const jobs = await fetchGreenhouseJobs('stripe', 'Stripe');

    expect(jobs[0].remote).toBe(true);
  });

  it('skips jobs without content', async () => {
    const mockResponse = {
      jobs: [
        {
          id: 12347,
          title: 'No Description Job',
          updated_at: '2024-01-15T10:00:00Z',
          absolute_url: 'https://boards.greenhouse.io/stripe/jobs/12347',
          internal_job_id: 1003,
          location: { name: 'NYC' },
          departments: [],
          offices: [],
          // No content field
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const jobs = await fetchGreenhouseJobs('stripe', 'Stripe');

    expect(jobs).toHaveLength(0);
  });

  it('throws error for 404 response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(fetchGreenhouseJobs('nonexistent', 'Company')).rejects.toThrow(
      'Greenhouse board not found: nonexistent'
    );
  }, 30000); // Allow time for retries

  it('throws error for 429 rate limit', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    await expect(fetchGreenhouseJobs('stripe', 'Stripe')).rejects.toThrow(
      'Rate limited by Greenhouse API'
    );
  }, 30000); // Allow time for retries

  it('handles empty job list', async () => {
    const mockResponse = { jobs: [] };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const jobs = await fetchGreenhouseJobs('newcompany', 'New Company');

    expect(jobs).toHaveLength(0);
  });
});

describe('validateGreenhouseBoard', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns true for valid board', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const result = await validateGreenhouseBoard('stripe');

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://boards-api.greenhouse.io/v1/boards/stripe',
      expect.objectContaining({ method: 'HEAD' })
    );
  });

  it('returns false for invalid board', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const result = await validateGreenhouseBoard('nonexistent');

    expect(result).toBe(false);
  });

  it('returns false on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await validateGreenhouseBoard('stripe');

    expect(result).toBe(false);
  });
});
