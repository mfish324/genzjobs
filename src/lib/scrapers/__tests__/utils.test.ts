import { describe, it, expect } from 'vitest';
import {
  stripHtml,
  extractSalary,
  detectRemote,
  generateSourceId,
  normalizeCompanyName,
  isValidUrl,
} from '../utils';

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('decodes common HTML entities', () => {
    expect(stripHtml('Rock &amp; Roll')).toBe('Rock & Roll');
    expect(stripHtml('&lt;code&gt;')).toBe('<code>');
    expect(stripHtml('Say &ldquo;hello&rdquo;')).toBe('Say \u201Chello\u201D');
    expect(stripHtml('It&rsquo;s great')).toBe('It\u2019s great');
  });

  it('normalizes whitespace', () => {
    expect(stripHtml('<p>Hello</p>   <p>World</p>')).toBe('Hello World');
    expect(stripHtml('Multiple   spaces')).toBe('Multiple spaces');
  });

  it('handles empty input', () => {
    expect(stripHtml('')).toBe('');
  });

  it('decodes numeric entities', () => {
    expect(stripHtml('&#169; 2024')).toBe('© 2024');
    expect(stripHtml('&#x2764;')).toBe('❤');
  });
});

describe('extractSalary', () => {
  it('extracts salary range with k suffix', () => {
    const result = extractSalary('Salary: $100k - $150k per year');
    expect(result).toEqual({
      min: 100000,
      max: 150000,
      currency: 'USD',
      period: 'yearly',
    });
  });

  it('extracts full salary range', () => {
    const result = extractSalary('$85,000 - $120,000 annually');
    expect(result).toEqual({
      min: 85000,
      max: 120000,
      currency: 'USD',
      period: 'yearly',
    });
  });

  it('extracts hourly rate', () => {
    const result = extractSalary('$25 - $35/hr');
    expect(result).toEqual({
      min: 25,
      max: 35,
      currency: 'USD',
      period: 'hourly',
    });
  });

  it('extracts single value with k', () => {
    const result = extractSalary('Base salary $120k');
    expect(result).toEqual({
      min: 108000,
      max: 132000,
      currency: 'USD',
      period: 'yearly',
    });
  });

  it('returns null for no salary info', () => {
    expect(extractSalary('This job has competitive pay')).toBeNull();
    expect(extractSalary('Great opportunity!')).toBeNull();
  });

  it('handles "to" separator', () => {
    const result = extractSalary('$80,000 to $100,000');
    expect(result?.min).toBe(80000);
    expect(result?.max).toBe(100000);
  });
});

describe('detectRemote', () => {
  it('detects remote in location', () => {
    expect(detectRemote('Remote')).toBe(true);
    expect(detectRemote('Remote - US')).toBe(true);
    expect(detectRemote('San Francisco, Remote')).toBe(true);
    expect(detectRemote('Work from home')).toBe(true);
  });

  it('detects remote from workplace type', () => {
    expect(detectRemote('New York', 'remote')).toBe(true);
    expect(detectRemote('', 'Remote')).toBe(true);
  });

  it('returns false for onsite', () => {
    expect(detectRemote('San Francisco', 'onsite')).toBe(false);
    expect(detectRemote('New York', 'on-site')).toBe(false);
  });

  it('returns false for hybrid', () => {
    expect(detectRemote('Hybrid - San Francisco')).toBe(false);
  });

  it('returns false for no location', () => {
    expect(detectRemote('')).toBe(false);
    expect(detectRemote('', '')).toBe(false);
  });

  it('handles office locations', () => {
    expect(detectRemote('San Francisco, CA')).toBe(false);
    expect(detectRemote('New York, NY')).toBe(false);
  });
});

describe('generateSourceId', () => {
  it('generates correct format', () => {
    expect(generateSourceId('greenhouse', 'stripe', '12345')).toBe('greenhouse_stripe_12345');
    expect(generateSourceId('LEVER', 'spotify', 'abc-123')).toBe('lever_spotify_abc-123');
  });

  it('handles numeric job IDs', () => {
    expect(generateSourceId('greenhouse', 'airbnb', 99999)).toBe('greenhouse_airbnb_99999');
  });
});

describe('normalizeCompanyName', () => {
  it('removes common suffixes', () => {
    expect(normalizeCompanyName('Stripe, Inc.')).toBe('Stripe');
    expect(normalizeCompanyName('Acme LLC')).toBe('Acme');
    expect(normalizeCompanyName('Example Corp')).toBe('Example');
    expect(normalizeCompanyName('Test Corporation')).toBe('Test');
  });

  it('trims whitespace', () => {
    expect(normalizeCompanyName('  Stripe  ')).toBe('Stripe');
  });

  it('handles names without suffixes', () => {
    expect(normalizeCompanyName('Google')).toBe('Google');
    expect(normalizeCompanyName('Meta')).toBe('Meta');
  });
});

describe('isValidUrl', () => {
  it('returns true for valid URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://localhost:3000')).toBe(true);
    expect(isValidUrl('https://stripe.com/jobs/123')).toBe(true);
  });

  it('returns false for invalid URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('example.com')).toBe(false);
  });
});
