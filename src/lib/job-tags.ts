import {
  Wifi,
  DollarSign,
  GraduationCap,
  Briefcase,
  BookOpen,
  Heart,
  Calendar,
  Users,
  Leaf,
  Rocket,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export interface JobTag {
  id: string;
  label: string;
  icon: LucideIcon;
  colorClass: string; // Tailwind bg + text classes
}

export const TAG_DEFINITIONS: Record<string, JobTag> = {
  remote: {
    id: "remote",
    label: "Remote",
    icon: Wifi,
    colorClass: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
  salary_transparent: {
    id: "salary_transparent",
    label: "Salary Listed",
    icon: DollarSign,
    colorClass: "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
  },
  entry_friendly: {
    id: "entry_friendly",
    label: "Entry Friendly",
    icon: GraduationCap,
    colorClass: "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  },
  no_degree: {
    id: "no_degree",
    label: "No Degree Req",
    icon: BookOpen,
    colorClass: "bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  },
  internship: {
    id: "internship",
    label: "Internship",
    icon: Briefcase,
    colorClass: "bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
  },
  apprenticeship: {
    id: "apprenticeship",
    label: "Apprenticeship",
    icon: BookOpen,
    colorClass: "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
  },
  mental_health: {
    id: "mental_health",
    label: "Wellness Benefits",
    icon: Heart,
    colorClass: "bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-800",
  },
  four_day_week: {
    id: "four_day_week",
    label: "4-Day Week",
    icon: Calendar,
    colorClass: "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  dei_committed: {
    id: "dei_committed",
    label: "DEI Focused",
    icon: Users,
    colorClass: "bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800",
  },
  purpose_driven: {
    id: "purpose_driven",
    label: "Purpose Driven",
    icon: Rocket,
    colorClass: "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  },
  sustainability: {
    id: "sustainability",
    label: "Green",
    icon: Leaf,
    colorClass: "bg-lime-100 dark:bg-lime-950/50 text-lime-700 dark:text-lime-400 border-lime-200 dark:border-lime-800",
  },
  fast_promotion: {
    id: "fast_promotion",
    label: "Fast Growth",
    icon: TrendingUp,
    colorClass: "bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  },
};

// The tags available for filtering on the jobs page
export const FILTERABLE_TAGS = [
  "remote",
  "salary_transparent",
  "entry_friendly",
  "no_degree",
  "internship",
  "four_day_week",
  "mental_health",
  "purpose_driven",
] as const;

interface JobForTagging {
  remote?: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  experienceLevel?: string | null;
  jobType?: string | null;
  category?: string | null;
  description?: string;
  benefits?: string | null;
}

const NO_DEGREE_PATTERNS = [
  /no degree/i,
  /degree not required/i,
  /without a degree/i,
  /no formal education/i,
  /high school diploma/i,
  /ged or equivalent/i,
];

const MENTAL_HEALTH_PATTERNS = [
  /mental health/i,
  /wellness program/i,
  /\beap\b/i,
  /employee assistance/i,
  /therapy benefit/i,
  /counseling benefit/i,
];

const FOUR_DAY_PATTERNS = [
  /4-day/i,
  /four-day/i,
  /32[ -]?hour/i,
  /4 day work/i,
];

const DEI_PATTERNS = [
  /\bdei\b/i,
  /diversity.{0,20}inclusion/i,
  /inclusive workplace/i,
  /belonging/i,
  /employee resource group/i,
  /\berg\b/i,
];

const PURPOSE_PATTERNS = [
  /mission[- ]driven/i,
  /social impact/i,
  /\bnonprofit\b/i,
  /\bnon-profit\b/i,
  /purpose[- ]driven/i,
  /make a difference/i,
];

const SUSTAINABILITY_PATTERNS = [
  /sustainability/i,
  /carbon neutral/i,
  /carbon footprint/i,
  /green energy/i,
  /environmental impact/i,
  /climate/i,
];

const FAST_PROMOTION_PATTERNS = [
  /fast[- ]track/i,
  /rapid advancement/i,
  /promotion path/i,
  /growth opportunity/i,
  /career progression/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

/**
 * Detect tags for a job based on its fields.
 * Returns up to 4 tags for display on cards.
 */
export function detectJobTags(job: JobForTagging): string[] {
  const tags: string[] = [];
  const text = [job.description || "", job.benefits || ""].join(" ");

  // Structural tags (most reliable)
  if (job.remote) tags.push("remote");
  if (job.salaryMin || job.salaryMax) tags.push("salary_transparent");
  if (job.experienceLevel === "ENTRY") tags.push("entry_friendly");
  if (job.jobType === "internship") tags.push("internship");
  if (job.jobType === "apprenticeship" || job.category === "apprenticeship") tags.push("apprenticeship");

  // Description-based tags (fuzzy)
  if (matchesAny(text, NO_DEGREE_PATTERNS)) tags.push("no_degree");
  if (matchesAny(text, MENTAL_HEALTH_PATTERNS)) tags.push("mental_health");
  if (matchesAny(text, FOUR_DAY_PATTERNS)) tags.push("four_day_week");
  if (matchesAny(text, DEI_PATTERNS)) tags.push("dei_committed");
  if (matchesAny(text, PURPOSE_PATTERNS)) tags.push("purpose_driven");
  if (matchesAny(text, SUSTAINABILITY_PATTERNS)) tags.push("sustainability");
  if (matchesAny(text, FAST_PROMOTION_PATTERNS)) tags.push("fast_promotion");

  // Deduplicate and limit to 4
  return [...new Set(tags)].slice(0, 4);
}

/**
 * Generate a short value proposition from detected tags.
 */
export function generateValueProp(tags: string[], company: string): string | null {
  const highlights: string[] = [];

  if (tags.includes("remote")) highlights.push("Remote");
  if (tags.includes("salary_transparent")) highlights.push("Salary listed");
  if (tags.includes("four_day_week")) highlights.push("4-day week");
  if (tags.includes("entry_friendly")) highlights.push("Entry friendly");
  if (tags.includes("no_degree")) highlights.push("No degree required");
  if (tags.includes("mental_health")) highlights.push("Wellness benefits");

  if (highlights.length === 0) return null;
  return highlights.slice(0, 3).join(" · ");
}
