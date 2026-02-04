/**
 * Job Classification Module
 *
 * Classifies jobs by experience level and audience tags for multi-platform targeting.
 * Used by GenZ Jobs (entry), JobScroll (mid-senior), and RJRP (verified employers).
 */

// ==================== Types ====================

export type ExperienceLevelType = 'ENTRY' | 'MID' | 'SENIOR' | 'EXECUTIVE';
export type AudienceTag = 'genz' | 'mid_career' | 'senior' | 'executive';

export interface ClassificationResult {
  experienceLevel: ExperienceLevelType;
  audienceTags: AudienceTag[];
  confidence: number; // 0-1
  signals: {
    titleMatch?: string;
    yearsRequired?: { min: number; max: number };
    salaryBand?: string;
    descriptionSignals?: string[];
  };
}

export interface JobInput {
  title: string;
  description: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  location?: string | null;
}

// ==================== Signal Definitions ====================

const TITLE_SIGNALS = {
  entry: [
    'intern', 'internship', 'entry level', 'entry-level',
    'junior', 'associate', 'coordinator', 'assistant',
    'trainee', 'apprentice', 'graduate', 'early career',
    'new grad', 'jr.', 'jr '
  ],
  mid: [
    'specialist', 'analyst', 'manager', 'lead',
    'supervisor', 'experienced', 'mid-level', 'mid level',
    'team lead', 'project manager'
  ],
  senior: [
    'senior', 'sr.', 'sr ', 'director', 'head of', 'principal',
    'staff engineer', 'staff developer', 'architect',
    'senior manager', 'engineering manager'
  ],
  executive: [
    'vp', 'vice president', 'chief', 'cto', 'cfo', 'ceo',
    'coo', 'cmo', 'cio', 'president', 'partner',
    'executive director', 'svp', 'evp', 'general manager', 'gm',
    'founder', 'co-founder', 'managing director'
  ]
} as const;

// Words that look like seniority indicators but aren't
const SENIOR_BLOCKLIST = [
  'senior living',
  'senior care',
  'senior center',
  'senior community',
  'senior services',
  'senior citizen',
  'senior housing',
  'senior residence',
  'senior home',
  'senior wellness'
];

// Retail/service companies where "manager" is often entry-level
const RETAIL_SERVICE_COMPANIES = [
  'mcdonald', 'burger king', 'wendy', 'taco bell', 'kfc',
  'subway', 'starbucks', 'dunkin', 'chipotle', 'chick-fil-a',
  'walmart', 'target', 'costco', 'cvs', 'walgreens',
  'dollar general', 'dollar tree', 'family dollar',
  'pizza hut', 'domino', 'papa john'
];

// Description signals for additional context
const DESCRIPTION_SIGNALS = {
  entry: [
    'no experience required',
    'no experience necessary',
    'no experience needed',
    'no prior experience',
    'entry level position',
    'entry-level position',
    'recent graduate',
    'fresh graduate',
    'will train',
    'training provided',
    'learn on the job'
  ],
  mid: [
    'manage a team',
    'lead a team',
    'team management',
    '2-3 years',
    '3-5 years',
    'proven track record'
  ],
  senior: [
    'report to the ceo',
    'report to the cto',
    'report to the cfo',
    'reports to ceo',
    'reports to cto',
    'report directly to',
    'extensive experience',
    'expert level',
    'deep expertise',
    '7+ years',
    '8+ years',
    '10+ years'
  ],
  executive: [
    'board of directors',
    'c-suite',
    'executive team',
    'p&l responsibility',
    'profit and loss',
    'company strategy',
    'organizational strategy',
    '15+ years',
    '20+ years'
  ]
};

// ==================== Parsing Functions ====================

/**
 * Parse years of experience from job description
 */
export function parseYearsRequired(text: string): { min: number; max: number } | null {
  const lowerText = text.toLowerCase();

  // Check for "no experience" patterns first
  if (/no experience (?:required|necessary|needed)/i.test(lowerText) ||
      /entry.?level/i.test(lowerText)) {
    return { min: 0, max: 0 };
  }

  // Pattern: "X-Y years" or "X to Y years"
  const rangeMatch = lowerText.match(/(\d+)\s*(?:to|-)\s*(\d+)\s*(?:\+)?\s*years?/i);
  if (rangeMatch) {
    return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) };
  }

  // Pattern: "X+ years"
  const plusMatch = lowerText.match(/(\d+)\+\s*years?/i);
  if (plusMatch) {
    const years = parseInt(plusMatch[1]);
    return { min: years, max: years + 5 }; // Estimate max as +5
  }

  // Pattern: "minimum X years" or "at least X years"
  const minMatch = lowerText.match(/(?:minimum|at least|min\.?)\s*(\d+)\s*years?/i);
  if (minMatch) {
    const years = parseInt(minMatch[1]);
    return { min: years, max: years + 3 };
  }

  // Pattern: "X years of experience" or "X years experience"
  const simpleMatch = lowerText.match(/(\d+)\s*years?\s*(?:of\s+)?experience/i);
  if (simpleMatch) {
    const years = parseInt(simpleMatch[1]);
    return { min: years, max: years };
  }

  return null;
}

/**
 * Map years of experience to experience level
 */
function yearsToLevel(years: { min: number; max: number }): ExperienceLevelType {
  const avg = (years.min + years.max) / 2;

  if (avg <= 2) return 'ENTRY';
  if (avg <= 5) return 'MID';
  if (avg <= 10) return 'SENIOR';
  return 'EXECUTIVE';
}

/**
 * Map salary to experience level
 */
function salaryToLevel(salaryMin?: number | null, salaryMax?: number | null): ExperienceLevelType | null {
  // Need at least one salary value
  if (!salaryMin && !salaryMax) return null;

  // Use the average if both available, otherwise use whichever exists
  const salary = salaryMin && salaryMax
    ? (salaryMin + salaryMax) / 2
    : (salaryMin || salaryMax)!;

  // These thresholds assume USD annual salary
  if (salary < 50000) return 'ENTRY';
  if (salary < 90000) return 'MID';
  if (salary < 150000) return 'SENIOR';
  return 'EXECUTIVE';
}

/**
 * Get salary band description
 */
function getSalaryBand(salaryMin?: number | null, salaryMax?: number | null): string | null {
  if (!salaryMin && !salaryMax) return null;

  const salary = salaryMin && salaryMax
    ? (salaryMin + salaryMax) / 2
    : (salaryMin || salaryMax)!;

  if (salary < 50000) return '<$50k (entry)';
  if (salary < 90000) return '$50k-$90k (mid)';
  if (salary < 150000) return '$90k-$150k (senior)';
  return '>$150k (executive)';
}

/**
 * Check if title contains a blocklisted "senior" phrase
 */
function isSeniorBlocklisted(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  return SENIOR_BLOCKLIST.some(phrase => lowerTitle.includes(phrase));
}

/**
 * Check if company is retail/service (where manager titles are often entry-level)
 */
function isRetailServiceCompany(company?: string): boolean {
  if (!company) return false;
  const lowerCompany = company.toLowerCase();
  return RETAIL_SERVICE_COMPANIES.some(name => lowerCompany.includes(name));
}

/**
 * Analyze job title for experience level signals
 */
function analyzeTitleSignals(title: string): { level: ExperienceLevelType | null; match: string | null } {
  const lowerTitle = title.toLowerCase();

  // Check for blocklisted "senior" phrases first
  if (isSeniorBlocklisted(title)) {
    // Check for actual entry-level indicators
    for (const signal of TITLE_SIGNALS.entry) {
      if (lowerTitle.includes(signal)) {
        return { level: 'ENTRY', match: signal };
      }
    }
    // Default to MID for senior living/care roles without other indicators
    return { level: 'MID', match: 'senior (care context)' };
  }

  // Check executive signals first (highest priority)
  for (const signal of TITLE_SIGNALS.executive) {
    if (lowerTitle.includes(signal)) {
      return { level: 'EXECUTIVE', match: signal };
    }
  }

  // Check senior signals
  for (const signal of TITLE_SIGNALS.senior) {
    if (lowerTitle.includes(signal)) {
      return { level: 'SENIOR', match: signal };
    }
  }

  // Check entry signals
  for (const signal of TITLE_SIGNALS.entry) {
    if (lowerTitle.includes(signal)) {
      return { level: 'ENTRY', match: signal };
    }
  }

  // Check mid signals last (most common, least specific)
  for (const signal of TITLE_SIGNALS.mid) {
    if (lowerTitle.includes(signal)) {
      return { level: 'MID', match: signal };
    }
  }

  return { level: null, match: null };
}

/**
 * Analyze description for experience level signals
 */
function analyzeDescriptionSignals(description: string): { level: ExperienceLevelType | null; matches: string[] } {
  const lowerDesc = description.toLowerCase();
  const matches: string[] = [];
  let level: ExperienceLevelType | null = null;

  // Check in order of specificity (executive -> senior -> entry -> mid)
  for (const signal of DESCRIPTION_SIGNALS.executive) {
    if (lowerDesc.includes(signal)) {
      matches.push(signal);
      level = 'EXECUTIVE';
    }
  }

  if (!level) {
    for (const signal of DESCRIPTION_SIGNALS.senior) {
      if (lowerDesc.includes(signal)) {
        matches.push(signal);
        level = 'SENIOR';
      }
    }
  }

  if (!level) {
    for (const signal of DESCRIPTION_SIGNALS.entry) {
      if (lowerDesc.includes(signal)) {
        matches.push(signal);
        level = 'ENTRY';
      }
    }
  }

  if (!level) {
    for (const signal of DESCRIPTION_SIGNALS.mid) {
      if (lowerDesc.includes(signal)) {
        matches.push(signal);
        level = 'MID';
      }
    }
  }

  return { level, matches };
}

/**
 * Map experience level to audience tags
 */
function levelToAudienceTags(level: ExperienceLevelType): AudienceTag[] {
  switch (level) {
    case 'ENTRY':
      return ['genz'];
    case 'MID':
      return ['mid_career'];
    case 'SENIOR':
      return ['senior'];
    case 'EXECUTIVE':
      return ['executive'];
  }
}

// ==================== Main Classification Function ====================

/**
 * Classify a job by experience level and audience tags
 *
 * Uses weighted scoring:
 * - Title analysis: 10 points
 * - Experience years: 8 points
 * - Salary analysis: 5 points
 * - Description signals: 3 points
 */
export function classifyJob(job: JobInput): ClassificationResult {
  const signals: ClassificationResult['signals'] = {};

  // Scoring by level
  const scores: Record<ExperienceLevelType, number> = {
    ENTRY: 0,
    MID: 0,
    SENIOR: 0,
    EXECUTIVE: 0
  };

  let totalWeight = 0;

  // 1. Title Analysis (weight: 10)
  const titleResult = analyzeTitleSignals(job.title);
  if (titleResult.level) {
    scores[titleResult.level] += 10;
    totalWeight += 10;
    signals.titleMatch = titleResult.match || undefined;
  }

  // 2. Experience Years Parsing (weight: 8)
  const years = parseYearsRequired(job.description);
  if (years) {
    const yearsLevel = yearsToLevel(years);
    scores[yearsLevel] += 8;
    totalWeight += 8;
    signals.yearsRequired = years;
  }

  // 3. Salary Analysis (weight: 5)
  const salaryLevel = salaryToLevel(job.salaryMin, job.salaryMax);
  if (salaryLevel) {
    scores[salaryLevel] += 5;
    totalWeight += 5;
    signals.salaryBand = getSalaryBand(job.salaryMin, job.salaryMax) || undefined;
  }

  // 4. Description Signals (weight: 3)
  const descResult = analyzeDescriptionSignals(job.description);
  if (descResult.level) {
    scores[descResult.level] += 3;
    totalWeight += 3;
    if (descResult.matches.length > 0) {
      signals.descriptionSignals = descResult.matches;
    }
  }

  // Determine winning level
  let maxScore = 0;
  let winningLevel: ExperienceLevelType = 'MID'; // Default

  for (const [level, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      winningLevel = level as ExperienceLevelType;
    }
  }

  // Calculate confidence (0-1)
  // Confidence is based on: signal strength and agreement
  let confidence: number;

  if (totalWeight === 0) {
    // No signals found - low confidence, default to MID
    confidence = 0.3;
  } else {
    // Base confidence on winning score vs total possible
    const maxPossible = totalWeight;
    confidence = maxScore / maxPossible;

    // Boost confidence if multiple signals agree
    const signalCount = Object.values(scores).filter(s => s > 0).length;
    if (signalCount === 1) {
      confidence *= 0.9; // Single signal, slightly reduce confidence
    }
  }

  // Determine audience tags
  let audienceTags = levelToAudienceTags(winningLevel);

  // Handle ambiguous cases - allow dual-tagging
  if (confidence < 0.5 && totalWeight > 0) {
    // Find second-highest scoring level
    const sortedLevels = Object.entries(scores)
      .filter(([_, score]) => score > 0)
      .sort(([_, a], [__, b]) => b - a);

    if (sortedLevels.length >= 2) {
      const [firstLevel, firstScore] = sortedLevels[0];
      const [secondLevel, secondScore] = sortedLevels[1];

      // If scores are close (within 3 points), dual-tag
      if (firstScore - secondScore <= 3) {
        const secondTags = levelToAudienceTags(secondLevel as ExperienceLevelType);
        audienceTags = [...new Set([...audienceTags, ...secondTags])];
      }
    }
  }

  return {
    experienceLevel: winningLevel,
    audienceTags,
    confidence: Math.round(confidence * 100) / 100, // Round to 2 decimal places
    signals
  };
}

/**
 * Classify a job with company context (for retail/service disambiguation)
 */
export function classifyJobWithCompany(
  job: JobInput & { company?: string }
): ClassificationResult {
  const baseResult = classifyJob(job);

  // Check for retail/service manager disambiguation
  if (job.company && isRetailServiceCompany(job.company)) {
    const lowerTitle = job.title.toLowerCase();

    // If it's a "manager" title at a retail company with low/no salary
    if (lowerTitle.includes('manager') && !lowerTitle.includes('general manager')) {
      const salaryLevel = salaryToLevel(job.salaryMin, job.salaryMax);

      // If salary suggests entry-level or no salary data
      if (!salaryLevel || salaryLevel === 'ENTRY') {
        return {
          ...baseResult,
          experienceLevel: 'ENTRY',
          audienceTags: ['genz'],
          confidence: Math.max(baseResult.confidence, 0.7), // Retail manager = fairly confident entry
          signals: {
            ...baseResult.signals,
            descriptionSignals: [
              ...(baseResult.signals.descriptionSignals || []),
              'retail/service manager context'
            ]
          }
        };
      }
    }
  }

  return baseResult;
}

export default classifyJob;
