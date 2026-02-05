import { describe, it, expect } from 'vitest';
import {
  classifyJob,
  classifyJobWithCompany,
  parseYearsRequired,
  type JobInput,
} from '../classifyJob';

describe('classifyJob', () => {
  // ==================== Clear Entry-Level ====================
  describe('Entry-level jobs', () => {
    it('classifies "Marketing Intern" as ENTRY', () => {
      const result = classifyJob({
        title: 'Marketing Intern',
        description: 'Join our team as a marketing intern.',
      });
      expect(result.experienceLevel).toBe('ENTRY');
      expect(result.audienceTags).toContain('genz');
    });

    it('classifies "Junior Software Developer" as ENTRY', () => {
      const result = classifyJob({
        title: 'Junior Software Developer',
        description: 'Looking for a junior developer to join our team.',
      });
      expect(result.experienceLevel).toBe('ENTRY');
      expect(result.audienceTags).toContain('genz');
    });

    it('classifies "Entry Level Sales Representative" as ENTRY', () => {
      const result = classifyJob({
        title: 'Entry Level Sales Representative',
        description: 'Entry level sales position available.',
      });
      expect(result.experienceLevel).toBe('ENTRY');
      expect(result.audienceTags).toContain('genz');
    });

    it('classifies "Student Representatives" as ENTRY', () => {
      const result = classifyJob({
        title: 'Student Representatives',
        description: 'Looking for student representatives.',
      });
      expect(result.experienceLevel).toBe('ENTRY');
      expect(result.audienceTags).toContain('genz');
    });

    it('classifies "Graduate Trainee" as ENTRY', () => {
      const result = classifyJob({
        title: 'Graduate Trainee',
        description: 'Graduate trainee program for recent graduates.',
      });
      expect(result.experienceLevel).toBe('ENTRY');
      expect(result.audienceTags).toContain('genz');
    });

    it('classifies "Office Assistant" as ENTRY', () => {
      const result = classifyJob({
        title: 'Office Assistant',
        description: 'Looking for an office assistant.',
      });
      expect(result.experienceLevel).toBe('ENTRY');
      expect(result.audienceTags).toContain('genz');
    });
  });

  // ==================== Clear Mid-Level ====================
  describe('Mid-level jobs', () => {
    it('classifies "Project Manager" with 3-5 years as MID', () => {
      const result = classifyJob({
        title: 'Project Manager',
        description: 'Looking for a project manager with 3-5 years of experience.',
      });
      expect(result.experienceLevel).toBe('MID');
      expect(result.audienceTags).toContain('mid_career');
    });

    it('classifies "Marketing Specialist" as MID', () => {
      const result = classifyJob({
        title: 'Marketing Specialist',
        description: 'Marketing specialist position available.',
      });
      expect(result.experienceLevel).toBe('MID');
      expect(result.audienceTags).toContain('mid_career');
    });

    it('classifies "Team Lead - Customer Success" as MID', () => {
      const result = classifyJob({
        title: 'Team Lead - Customer Success',
        description: 'Lead our customer success team.',
      });
      expect(result.experienceLevel).toBe('MID');
      expect(result.audienceTags).toContain('mid_career');
    });

    it('classifies "Data Analyst" as MID', () => {
      const result = classifyJob({
        title: 'Data Analyst',
        description: 'Analyze data and provide insights.',
      });
      expect(result.experienceLevel).toBe('MID');
      expect(result.audienceTags).toContain('mid_career');
    });
  });

  // ==================== Clear Senior ====================
  describe('Senior-level jobs', () => {
    it('classifies "Senior Software Engineer" as SENIOR', () => {
      const result = classifyJob({
        title: 'Senior Software Engineer',
        description: 'Senior engineer position available.',
      });
      expect(result.experienceLevel).toBe('SENIOR');
      expect(result.audienceTags).toContain('senior');
    });

    it('classifies "Director of Engineering" as SENIOR', () => {
      const result = classifyJob({
        title: 'Director of Engineering',
        description: 'Lead our engineering organization.',
      });
      expect(result.experienceLevel).toBe('SENIOR');
      expect(result.audienceTags).toContain('senior');
    });

    it('classifies "Principal Product Designer" as SENIOR', () => {
      const result = classifyJob({
        title: 'Principal Product Designer',
        description: 'Principal designer role.',
      });
      expect(result.experienceLevel).toBe('SENIOR');
      expect(result.audienceTags).toContain('senior');
    });

    it('classifies "Staff Engineer" as SENIOR', () => {
      const result = classifyJob({
        title: 'Staff Engineer',
        description: 'Staff-level engineering position.',
      });
      expect(result.experienceLevel).toBe('SENIOR');
      expect(result.audienceTags).toContain('senior');
    });

    it('classifies "Engineering Manager" as SENIOR', () => {
      const result = classifyJob({
        title: 'Engineering Manager',
        description: 'Manage a team of engineers.',
      });
      expect(result.experienceLevel).toBe('SENIOR');
      expect(result.audienceTags).toContain('senior');
    });
  });

  // ==================== Clear Executive ====================
  describe('Executive-level jobs', () => {
    it('classifies "Chief Technology Officer" as EXECUTIVE', () => {
      const result = classifyJob({
        title: 'Chief Technology Officer',
        description: 'Lead our technology strategy.',
      });
      expect(result.experienceLevel).toBe('EXECUTIVE');
      expect(result.audienceTags).toContain('executive');
    });

    it('classifies "VP of Sales" as EXECUTIVE', () => {
      const result = classifyJob({
        title: 'VP of Sales',
        description: 'Lead our sales organization.',
      });
      expect(result.experienceLevel).toBe('EXECUTIVE');
      expect(result.audienceTags).toContain('executive');
    });

    it('classifies "General Manager - West Region" as EXECUTIVE', () => {
      const result = classifyJob({
        title: 'General Manager - West Region',
        description: 'Oversee all operations in the West region.',
      });
      expect(result.experienceLevel).toBe('EXECUTIVE');
      expect(result.audienceTags).toContain('executive');
    });

    it('classifies "CEO" as EXECUTIVE', () => {
      const result = classifyJob({
        title: 'CEO',
        description: 'Chief Executive Officer position.',
      });
      expect(result.experienceLevel).toBe('EXECUTIVE');
      expect(result.audienceTags).toContain('executive');
    });

    it('classifies "Founder" as EXECUTIVE', () => {
      const result = classifyJob({
        title: 'Co-Founder / CTO',
        description: 'Looking for a technical co-founder.',
      });
      expect(result.experienceLevel).toBe('EXECUTIVE');
      expect(result.audienceTags).toContain('executive');
    });
  });

  // ==================== Edge Cases - "Senior" in non-seniority context ====================
  describe('Edge cases - Senior in non-seniority context', () => {
    it('classifies "Senior Living Coordinator" as ENTRY or MID (not SENIOR)', () => {
      const result = classifyJob({
        title: 'Senior Living Coordinator',
        description: 'Coordinate activities for senior living residents.',
      });
      expect(result.experienceLevel).not.toBe('SENIOR');
      expect(['ENTRY', 'MID']).toContain(result.experienceLevel);
    });

    it('classifies "Senior Care Assistant" as ENTRY (not SENIOR)', () => {
      const result = classifyJob({
        title: 'Senior Care Assistant',
        description: 'Assist with senior care activities.',
      });
      expect(result.experienceLevel).toBe('ENTRY');
      expect(result.audienceTags).toContain('genz');
    });

    it('classifies "Senior Center Program Manager" as MID (not SENIOR)', () => {
      const result = classifyJob({
        title: 'Senior Center Program Manager',
        description: 'Manage programs at our senior center.',
      });
      expect(result.experienceLevel).not.toBe('SENIOR');
    });

    it('classifies "Senior Housing Coordinator" as MID (not SENIOR)', () => {
      const result = classifyJob({
        title: 'Senior Housing Coordinator',
        description: 'Coordinate senior housing programs.',
      });
      expect(result.experienceLevel).not.toBe('SENIOR');
    });
  });

  // ==================== Edge Cases - Executive word boundaries ====================
  describe('Edge cases - Executive word boundaries', () => {
    it('does NOT classify "Postdoctoral" as EXECUTIVE (no false CTO match)', () => {
      const result = classifyJob({
        title: 'DOJ Pathways Recent Graduate Program - Bureau of Prisons (Psychology Postdoctoral Trainee)',
        description: 'Postdoctoral training position.',
      });
      expect(result.experienceLevel).not.toBe('EXECUTIVE');
      // Should match "graduate" as entry-level
      expect(result.experienceLevel).toBe('ENTRY');
    });

    it('does NOT classify "Director of Photography" as EXECUTIVE', () => {
      const result = classifyJob({
        title: 'Director of Photography',
        description: 'Camera work and cinematography.',
      });
      // "Director" matches SENIOR, not executive
      expect(result.experienceLevel).toBe('SENIOR');
    });
  });

  // ==================== Experience Parsing ====================
  describe('Experience years parsing', () => {
    it('classifies job with "5+ years of experience" as SENIOR', () => {
      const result = classifyJob({
        title: 'Software Engineer',
        description: 'We are looking for someone with 5+ years of experience.',
      });
      expect(result.experienceLevel).toBe('SENIOR');
      expect(result.signals.yearsRequired).toEqual({ min: 5, max: 10 });
    });

    it('classifies job with "No experience necessary" as ENTRY', () => {
      const result = classifyJob({
        title: 'Customer Service Rep',
        description: 'No experience necessary. We will train you!',
      });
      expect(result.experienceLevel).toBe('ENTRY');
      expect(result.signals.yearsRequired).toEqual({ min: 0, max: 0 });
    });

    it('classifies job with "minimum 3 years" as MID', () => {
      const result = classifyJob({
        title: 'Developer',
        description: 'Requires minimum 3 years of experience.',
      });
      expect(result.experienceLevel).toBe('MID');
    });

    it('classifies job with "15+ years" as EXECUTIVE', () => {
      const result = classifyJob({
        title: 'Consultant',
        description: 'Looking for someone with 15+ years experience in the industry.',
      });
      expect(result.experienceLevel).toBe('EXECUTIVE');
    });

    it('rejects unrealistic years (56 years)', () => {
      const result = parseYearsRequired('Must have 56 years of experience');
      expect(result).toBeNull();
    });
  });

  // ==================== Salary-based Classification ====================
  describe('Salary-based classification', () => {
    it('classifies low salary (<$60k) as ENTRY', () => {
      const result = classifyJob({
        title: 'Support Specialist',
        description: 'Customer support role.',
        salaryMin: 35000,
        salaryMax: 45000,
      });
      expect(result.experienceLevel).toBe('ENTRY');
      expect(result.signals.salaryBand).toBe('<$60k (entry)');
    });

    it('classifies mid salary ($60k-$100k) as MID', () => {
      const result = classifyJob({
        title: 'Account Manager',
        description: 'Manage client accounts.',
        salaryMin: 70000,
        salaryMax: 90000,
      });
      expect(result.experienceLevel).toBe('MID');
      expect(result.signals.salaryBand).toBe('$60k-$100k (mid)');
    });

    it('classifies high salary ($100k-$200k) as SENIOR', () => {
      const result = classifyJob({
        title: 'Software Engineer',
        description: 'Build software.',
        salaryMin: 150000,
        salaryMax: 180000,
      });
      expect(result.experienceLevel).toBe('SENIOR');
      expect(result.signals.salaryBand).toBe('$100k-$200k (senior)');
    });

    it('classifies very high salary (>$200k) as EXECUTIVE', () => {
      const result = classifyJob({
        title: 'Technical Lead',
        description: 'Lead technical initiatives.',
        salaryMin: 250000,
        salaryMax: 300000,
      });
      expect(result.experienceLevel).toBe('EXECUTIVE');
      expect(result.signals.salaryBand).toBe('>$200k (executive)');
    });
  });

  // ==================== Retail Manager Disambiguation ====================
  describe('Retail manager disambiguation', () => {
    it('classifies "Shift Manager" at McDonald\'s with low salary as ENTRY', () => {
      const result = classifyJobWithCompany({
        title: 'Shift Manager',
        description: 'Manage shifts at our restaurant.',
        salaryMin: 30000,
        salaryMax: 40000,
        company: "McDonald's",
      });
      expect(result.experienceLevel).toBe('ENTRY');
      expect(result.audienceTags).toContain('genz');
    });

    it('classifies "Store Manager" at Walmart as ENTRY', () => {
      const result = classifyJobWithCompany({
        title: 'Store Manager',
        description: 'Manage store operations.',
        salaryMin: 35000,
        salaryMax: 45000,
        company: 'Walmart',
      });
      expect(result.experienceLevel).toBe('ENTRY');
    });

    it('does NOT downgrade "General Manager" at retail company', () => {
      const result = classifyJobWithCompany({
        title: 'General Manager',
        description: 'Oversee all operations.',
        company: "McDonald's",
      });
      // General Manager should stay EXECUTIVE
      expect(result.experienceLevel).toBe('EXECUTIVE');
    });
  });

  // ==================== Ambiguous / Low Confidence ====================
  describe('Ambiguous / low confidence cases', () => {
    it('defaults to MID with low confidence when no signals', () => {
      const result = classifyJob({
        title: 'Technical Writer',
        description: 'Write technical documentation.',
      });
      expect(result.experienceLevel).toBe('MID');
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });

    it('dual-tags ambiguous roles', () => {
      const result = classifyJob({
        title: 'Marketing Coordinator',
        description: 'Help with marketing activities. 2 years experience preferred.',
      });
      // Coordinator is entry, but 2 years could be entry/mid boundary
      expect(result.audienceTags.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==================== Confidence Scoring ====================
  describe('Confidence scoring', () => {
    it('has high confidence when multiple signals agree', () => {
      const result = classifyJob({
        title: 'Senior Software Engineer',
        description: 'Looking for a senior engineer with 7+ years experience.',
        salaryMin: 150000,
        salaryMax: 180000,
      });
      expect(result.experienceLevel).toBe('SENIOR');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('has lower confidence with conflicting signals', () => {
      const result = classifyJob({
        title: 'Junior Developer',
        description: 'Requires 5+ years of experience.', // Conflicting
      });
      // Junior in title vs senior years requirement
      expect(result.confidence).toBeLessThan(0.8);
    });
  });
});

describe('parseYearsRequired', () => {
  it('parses "3-5 years" correctly', () => {
    const result = parseYearsRequired('Requires 3-5 years of experience');
    expect(result).toEqual({ min: 3, max: 5 });
  });

  it('parses "5+ years" correctly', () => {
    const result = parseYearsRequired('Must have 5+ years experience');
    expect(result).toEqual({ min: 5, max: 10 });
  });

  it('parses "minimum 3 years" correctly', () => {
    const result = parseYearsRequired('Minimum 3 years required');
    expect(result).toEqual({ min: 3, max: 6 });
  });

  it('parses "at least 2 years" correctly', () => {
    const result = parseYearsRequired('At least 2 years of experience');
    expect(result).toEqual({ min: 2, max: 5 });
  });

  it('parses "no experience required" correctly', () => {
    const result = parseYearsRequired('No experience required');
    expect(result).toEqual({ min: 0, max: 0 });
  });

  it('parses "entry-level" correctly', () => {
    const result = parseYearsRequired('This is an entry-level position');
    expect(result).toEqual({ min: 0, max: 0 });
  });

  it('returns null for text without years', () => {
    const result = parseYearsRequired('Great opportunity to learn');
    expect(result).toBeNull();
  });

  it('rejects unreasonable years (>25)', () => {
    const result = parseYearsRequired('Requires 30 years of experience');
    expect(result).toBeNull();
  });
});
