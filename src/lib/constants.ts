// XP Constants
export const XP_REWARDS = {
  JOB_APPLICATION: 50,
  SAVE_JOB: 5,
  DAILY_QUEST: 25,
  WEEKLY_QUEST: 75,
  MILESTONE_QUEST: 150,
  PROFILE_COMPLETION: 100,
  DAILY_LOGIN: 10,
  EVENT_ATTENDANCE: 25,
  DAILY_SPIN_MIN: 10,
  DAILY_SPIN_MAX: 200,
  JAM_SESSION: 30,
} as const;

// Level calculation - curved thresholds
export const LEVEL_THRESHOLDS = [
  0,      // Level 1
  500,    // Level 2
  1200,   // Level 3
  2500,   // Level 4
  4500,   // Level 5
  7500,   // Level 6
  12000,  // Level 7
  18000,  // Level 8
  26000,  // Level 9
  40000,  // Level 10
] as const;

export const LEVEL_TITLES: Record<number, string> = {
  1: "Fresh Start",
  2: "Getting Warmed Up",
  3: "On the Rise",
  4: "Making Moves",
  5: "Career Climber",
  6: "Go-Getter",
  7: "Industry Ready",
  8: "Top Talent",
  9: "Career Legend",
  10: "Job Market Boss",
};

export function calculateLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level > LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return LEVEL_THRESHOLDS[level - 1];
}

export function xpToNextLevel(xp: number): number {
  const currentLevel = calculateLevel(xp);
  if (currentLevel >= LEVEL_THRESHOLDS.length) return 0;
  return LEVEL_THRESHOLDS[currentLevel] - xp;
}

export function levelProgress(xp: number): number {
  const currentLevel = calculateLevel(xp);
  if (currentLevel >= LEVEL_THRESHOLDS.length) return 100;
  const currentThreshold = LEVEL_THRESHOLDS[currentLevel - 1];
  const nextThreshold = LEVEL_THRESHOLDS[currentLevel];
  return ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
}

export function getMotivationalText(xp: number): string {
  const progress = levelProgress(xp);
  if (progress < 25) return "Just getting started — keep going!";
  if (progress < 50) return "You're building momentum!";
  if (progress < 75) return "Over halfway there — don't stop now!";
  return "Almost there — the next level awaits!";
}

export function getLevelTitle(level: number): string {
  return LEVEL_TITLES[level] || LEVEL_TITLES[10];
}

// Experience levels
export const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry Level (0-2 years)" },
  { value: "mid", label: "Mid Level (2-5 years)" },
  { value: "senior", label: "Senior Level (5+ years)" },
] as const;

// Job types
export const JOB_TYPES = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "apprenticeship", label: "Apprenticeship" },
] as const;

// Job categories
export const JOB_CATEGORIES = [
  { value: "tech", label: "Tech", icon: "💻", description: "Software, IT, Data & Digital" },
  { value: "trades", label: "Trades", icon: "🔧", description: "Electrician, Plumber, HVAC, Construction" },
  { value: "public-safety", label: "Public Safety", icon: "🚒", description: "Police, Fire, EMT, Security" },
  { value: "healthcare", label: "Healthcare", icon: "🏥", description: "Medical, Nursing, Allied Health" },
  { value: "apprenticeship", label: "Apprenticeships", icon: "📚", description: "Paid Training Programs" },
] as const;

// Common skills for tech jobs
export const TECH_SKILLS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Java",
  "C++",
  "Go",
  "Rust",
  "SQL",
  "PostgreSQL",
  "MongoDB",
  "AWS",
  "Docker",
  "Kubernetes",
  "Git",
  "REST APIs",
  "GraphQL",
  "HTML/CSS",
  "Tailwind CSS",
  "Vue.js",
  "Angular",
  "Swift",
  "Kotlin",
  "Machine Learning",
  "Data Analysis",
] as const;

// Trades skills
export const TRADES_SKILLS = [
  "Electrical Systems",
  "Plumbing",
  "HVAC",
  "Welding",
  "Carpentry",
  "Blueprint Reading",
  "Construction",
  "Masonry",
  "Pipefitting",
  "Sheet Metal",
  "Heavy Equipment",
  "Automotive Repair",
  "CNC Machining",
  "Industrial Maintenance",
  "Safety Compliance",
  "OSHA Certified",
] as const;

// Public safety skills
export const PUBLIC_SAFETY_SKILLS = [
  "Emergency Response",
  "First Aid/CPR",
  "EMT Certified",
  "Paramedic",
  "Firefighting",
  "Law Enforcement",
  "Crisis Management",
  "Physical Fitness",
  "Dispatch",
  "Investigation",
  "Security Operations",
  "Crowd Control",
] as const;

// Healthcare skills
export const HEALTHCARE_SKILLS = [
  "Patient Care",
  "Nursing",
  "Medical Terminology",
  "Phlebotomy",
  "Medical Records",
  "HIPAA Compliance",
  "Vital Signs",
  "EKG/ECG",
  "Medical Billing",
  "CNA Certified",
  "LPN",
  "RN",
] as const;

// Combined skills for all categories
export const COMMON_SKILLS = [
  ...TECH_SKILLS,
  ...TRADES_SKILLS,
  ...PUBLIC_SAFETY_SKILLS,
  ...HEALTHCARE_SKILLS,
  "Excel",
  "Communication",
  "Problem Solving",
  "Leadership",
  "Project Management",
  "Teamwork",
  "Customer Service",
] as const;

// Application statuses
export const APPLICATION_STATUSES = [
  { value: "applied", label: "Applied", color: "blue" },
  { value: "interviewing", label: "Interviewing", color: "yellow" },
  { value: "offered", label: "Offered", color: "green" },
  { value: "rejected", label: "Rejected", color: "red" },
  { value: "withdrawn", label: "Withdrawn", color: "gray" },
] as const;

// Quest types
export const QUEST_TYPES = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MILESTONE: "milestone",
} as const;

// Quest actions
export const QUEST_ACTIONS = {
  APPLY_JOBS: "apply_jobs",
  SAVE_JOBS: "save_jobs",
  COMPLETE_PROFILE: "complete_profile",
  ATTEND_EVENT: "attend_event",
  LOGIN: "login",
  UPDATE_SKILLS: "update_skills",
  VIEW_RESOURCES: "view_resources",
  DAILY_SPIN: "daily_spin",
} as const;

// Event types
export const EVENT_TYPES = [
  { value: "workshop", label: "Workshop" },
  { value: "qa", label: "Recruiter Q&A" },
  { value: "game_night", label: "Game Night" },
  { value: "networking", label: "Networking" },
] as const;

// Resource types
export const RESOURCE_TYPES = [
  { value: "article", label: "Article" },
  { value: "video", label: "Video" },
  { value: "podcast", label: "Podcast" },
  { value: "course", label: "Course" },
  { value: "tool", label: "Tool" },
] as const;

// Resource categories
export const RESOURCE_CATEGORIES = [
  { value: "resume", label: "Resume Building" },
  { value: "interview", label: "Interview Prep" },
  { value: "networking", label: "Networking" },
  { value: "skills", label: "Skill Development" },
  { value: "mindset", label: "Career Mindset" },
] as const;

// Company sizes
export const COMPANY_SIZES = [
  { value: "startup", label: "Startup (1-50)" },
  { value: "small", label: "Small (51-200)" },
  { value: "medium", label: "Medium (201-1000)" },
  { value: "large", label: "Large (1001-5000)" },
  { value: "enterprise", label: "Enterprise (5000+)" },
] as const;

// Reward categories
export const REWARD_CATEGORIES = [
  { value: "career_service", label: "Career Services" },
  { value: "merchandise", label: "Merchandise" },
  { value: "gift_card", label: "Gift Cards" },
  { value: "experience", label: "Experiences" },
] as const;
