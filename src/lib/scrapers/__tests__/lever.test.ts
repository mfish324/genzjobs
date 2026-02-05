import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchLeverJobs, validateLeverBoard } from '../lever';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('fetchLeverJobs', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses Lever API response correctly', async () => {
    const mockResponse = [
      {
        id: 'abc-123-def',
        text: 'Senior Software Engineer',
        hostedUrl: 'https://jobs.lever.co/netflix/abc-123-def',
        applyUrl: 'https://jobs.lever.co/netflix/abc-123-def/apply',
        createdAt: 1705312800000, // 2024-01-15T10:00:00Z
        categories: {
          team: 'Engineering',
          location: 'Los Gatos, CA',
          commitment: 'Full-time',
        },
        description: 'We are looking for a Senior Software Engineer.',
        lists: [
          {
            text: 'Requirements',
            content: '<li>5+ years of experience</li><li>Strong Python skills</li>',
          },
        ],
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const jobs = await fetchLeverJobs('netflix', 'Netflix');

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      sourceId: 'lever_netflix_abc-123-def',
      source: 'lever',
      title: 'Senior Software Engineer',
      company: 'Netflix',
      location: 'Los Gatos, CA',
      remote: false,
      jobType: 'full-time',
      department: 'Engineering',
    });
    expect(jobs[0].description).toContain('Senior Software Engineer');
    expect(jobs[0].description).toContain('5+ years of experience');
  });

  it('extracts native salary range', async () => {
    const mockResponse = [
      {
        id: 'xyz-456',
        text: 'Product Manager',
        hostedUrl: 'https://jobs.lever.co/netflix/xyz-456',
        applyUrl: 'https://jobs.lever.co/netflix/xyz-456/apply',
        createdAt: 1705312800000,
        categories: {
          location: 'Remote',
        },
        description: 'Product Manager role',
        salaryRange: {
          min: 150000,
          max: 200000,
          currency: 'USD',
          interval: 'per-year-salary',
        },
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const jobs = await fetchLeverJobs('netflix', 'Netflix');

    expect(jobs[0].salaryMin).toBe(150000);
    expect(jobs[0].salaryMax).toBe(200000);
    expect(jobs[0].salaryCurrency).toBe('USD');
    expect(jobs[0].salaryPeriod).toBe('yearly');
  });

  it('detects remote from workplaceType', async () => {
    const mockResponse = [
      {
        id: 'remote-job',
        text: 'Remote Engineer',
        hostedUrl: 'https://jobs.lever.co/spotify/remote-job',
        applyUrl: 'https://jobs.lever.co/spotify/remote-job/apply',
        createdAt: 1705312800000,
        categories: {
          location: 'New York, NY',
          workplaceType: 'remote',
        },
        description: 'Fully remote position.',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const jobs = await fetchLeverJobs('spotify', 'Spotify');

    expect(jobs[0].remote).toBe(true);
  });

  it('parses different commitment types', async () => {
    const commitmentTests = [
      { commitment: 'Full-time', expected: 'full-time' },
      { commitment: 'Part-time', expected: 'part-time' },
      { commitment: 'Contract', expected: 'contract' },
      { commitment: 'Internship', expected: 'internship' },
      { commitment: 'Contractor', expected: 'contract' },
    ];

    for (const test of commitmentTests) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          {
            id: `job-${test.commitment}`,
            text: 'Test Job',
            hostedUrl: 'https://jobs.lever.co/test/job',
            applyUrl: 'https://jobs.lever.co/test/job/apply',
            createdAt: 1705312800000,
            categories: {
              commitment: test.commitment,
            },
            description: 'Test description',
          },
        ]),
      });

      const jobs = await fetchLeverJobs('test', 'Test');
      expect(jobs[0].jobType).toBe(test.expected);
    }
  });

  it('skips jobs without description', async () => {
    const mockResponse = [
      {
        id: 'no-desc',
        text: 'No Description Job',
        hostedUrl: 'https://jobs.lever.co/spotify/no-desc',
        applyUrl: 'https://jobs.lever.co/spotify/no-desc/apply',
        createdAt: 1705312800000,
        categories: {},
        // No description or descriptionPlain
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const jobs = await fetchLeverJobs('spotify', 'Spotify');

    expect(jobs).toHaveLength(0);
  });

  it('throws error for 404 response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(fetchLeverJobs('nonexistent', 'Company')).rejects.toThrow(
      'Lever board not found: nonexistent'
    );
  }, 30000); // Allow time for retries

  it('throws error for 429 rate limit', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    await expect(fetchLeverJobs('spotify', 'Spotify')).rejects.toThrow(
      'Rate limited by Lever API'
    );
  }, 30000); // Allow time for retries

  it('handles empty job list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const jobs = await fetchLeverJobs('newcompany', 'New Company');

    expect(jobs).toHaveLength(0);
  });

  it('uses descriptionPlain as fallback', async () => {
    const mockResponse = [
      {
        id: 'plain-desc',
        text: 'Plain Description Job',
        hostedUrl: 'https://jobs.lever.co/spotify/plain-desc',
        applyUrl: 'https://jobs.lever.co/spotify/plain-desc/apply',
        createdAt: 1705312800000,
        categories: {},
        descriptionPlain: 'This is a plain text description without HTML.',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const jobs = await fetchLeverJobs('spotify', 'Spotify');

    expect(jobs).toHaveLength(1);
    expect(jobs[0].description).toContain('plain text description');
  });
});

describe('validateLeverBoard', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns true for valid board', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const result = await validateLeverBoard('netflix');

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.lever.co/v0/postings/netflix?mode=json',
      expect.objectContaining({ method: 'HEAD' })
    );
  });

  it('returns false for invalid board', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const result = await validateLeverBoard('nonexistent');

    expect(result).toBe(false);
  });

  it('returns false on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await validateLeverBoard('netflix');

    expect(result).toBe(false);
  });
});
