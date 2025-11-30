// XP Constants
export const XP_REWARDS = {
  JOB_APPLICATION: 50,
  DAILY_QUEST: 25,
  WEEKLY_QUEST: 75,
  MILESTONE_QUEST: 150,
  PROFILE_COMPLETION: 100,
  DAILY_LOGIN: 10,
  EVENT_ATTENDANCE: 25,
} as const;

// Level calculation
export const XP_PER_LEVEL = 100;

export function calculateLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpForLevel(level: number): number {
  return (level - 1) * XP_PER_LEVEL;
}

export function xpToNextLevel(xp: number): number {
  const currentLevel = calculateLevel(xp);
  const xpForNextLevel = currentLevel * XP_PER_LEVEL;
  return xpForNextLevel - xp;
}

export function levelProgress(xp: number): number {
  const xpInCurrentLevel = xp % XP_PER_LEVEL;
  return (xpInCurrentLevel / XP_PER_LEVEL) * 100;
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
] as const;

// Common skills for tech jobs
export const COMMON_SKILLS = [
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
  "Excel",
  "Communication",
  "Problem Solving",
  "Leadership",
  "Project Management",
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
  COMPLETE_PROFILE: "complete_profile",
  ATTEND_EVENT: "attend_event",
  LOGIN: "login",
  UPDATE_SKILLS: "update_skills",
  VIEW_RESOURCES: "view_resources",
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
