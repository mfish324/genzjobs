// Badge definitions and criteria

export interface BadgeDefinition {
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  criteria: string;
  threshold: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  xpBonus: number;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Application Badges
  {
    slug: "first_app",
    name: "First Step",
    description: "Applied to your first job",
    icon: "🎯",
    color: "#10B981",
    criteria: "applications",
    threshold: 1,
    rarity: "common",
    xpBonus: 25,
  },
  {
    slug: "app_5",
    name: "Getting Warmed Up",
    description: "Applied to 5 jobs",
    icon: "🔥",
    color: "#F59E0B",
    criteria: "applications",
    threshold: 5,
    rarity: "common",
    xpBonus: 50,
  },
  {
    slug: "app_10",
    name: "Application Ninja",
    description: "Applied to 10 jobs",
    icon: "🥷",
    color: "#6366F1",
    criteria: "applications",
    threshold: 10,
    rarity: "rare",
    xpBonus: 100,
  },
  {
    slug: "app_25",
    name: "Job Hunter Pro",
    description: "Applied to 25 jobs",
    icon: "🏹",
    color: "#8B5CF6",
    criteria: "applications",
    threshold: 25,
    rarity: "rare",
    xpBonus: 200,
  },
  {
    slug: "app_50",
    name: "Application Machine",
    description: "Applied to 50 jobs",
    icon: "🤖",
    color: "#EC4899",
    criteria: "applications",
    threshold: 50,
    rarity: "epic",
    xpBonus: 500,
  },
  {
    slug: "app_100",
    name: "Century Club",
    description: "Applied to 100 jobs",
    icon: "💯",
    color: "#EF4444",
    criteria: "applications",
    threshold: 100,
    rarity: "legendary",
    xpBonus: 1000,
  },

  // Streak Badges
  {
    slug: "streak_3",
    name: "Consistency",
    description: "Maintained a 3-day streak",
    icon: "✨",
    color: "#10B981",
    criteria: "streak",
    threshold: 3,
    rarity: "common",
    xpBonus: 30,
  },
  {
    slug: "streak_7",
    name: "Week Warrior",
    description: "Maintained a 7-day streak",
    icon: "🔥",
    color: "#F59E0B",
    criteria: "streak",
    threshold: 7,
    rarity: "rare",
    xpBonus: 100,
  },
  {
    slug: "streak_14",
    name: "Fortnight Fighter",
    description: "Maintained a 14-day streak",
    icon: "⚡",
    color: "#8B5CF6",
    criteria: "streak",
    threshold: 14,
    rarity: "epic",
    xpBonus: 250,
  },
  {
    slug: "streak_30",
    name: "Monthly Master",
    description: "Maintained a 30-day streak",
    icon: "👑",
    color: "#EF4444",
    criteria: "streak",
    threshold: 30,
    rarity: "legendary",
    xpBonus: 500,
  },

  // Success Badges
  {
    slug: "first_interview",
    name: "Called Back",
    description: "Got your first interview",
    icon: "📞",
    color: "#10B981",
    criteria: "interviews",
    threshold: 1,
    rarity: "rare",
    xpBonus: 150,
  },
  {
    slug: "first_offer",
    name: "Offer Received",
    description: "Received your first job offer",
    icon: "🎉",
    color: "#EF4444",
    criteria: "offers",
    threshold: 1,
    rarity: "legendary",
    xpBonus: 500,
  },

  // Engagement Badges
  {
    slug: "profile_complete",
    name: "All Set",
    description: "Completed your profile",
    icon: "✅",
    color: "#10B981",
    criteria: "profile_complete",
    threshold: 1,
    rarity: "common",
    xpBonus: 50,
  },
  {
    slug: "resume_uploaded",
    name: "Resume Ready",
    description: "Uploaded your resume",
    icon: "📄",
    color: "#6366F1",
    criteria: "resume_uploaded",
    threshold: 1,
    rarity: "common",
    xpBonus: 50,
  },
  {
    slug: "saved_10",
    name: "Wishlist Maker",
    description: "Saved 10 jobs for later",
    icon: "⭐",
    color: "#F59E0B",
    criteria: "saved_jobs",
    threshold: 10,
    rarity: "common",
    xpBonus: 30,
  },
  {
    slug: "quest_master",
    name: "Quest Master",
    description: "Completed 10 quests",
    icon: "🏆",
    color: "#8B5CF6",
    criteria: "quests_completed",
    threshold: 10,
    rarity: "rare",
    xpBonus: 100,
  },
  {
    slug: "event_attendee",
    name: "Community Member",
    description: "Attended your first event",
    icon: "🎪",
    color: "#EC4899",
    criteria: "events_attended",
    threshold: 1,
    rarity: "common",
    xpBonus: 50,
  },
  {
    slug: "jam_participant",
    name: "Jam Star",
    description: "Participated in a Job Jam session",
    icon: "🎸",
    color: "#6366F1",
    criteria: "jam_sessions",
    threshold: 1,
    rarity: "rare",
    xpBonus: 75,
  },

  // Level Badges
  {
    slug: "level_5",
    name: "Rising Star",
    description: "Reached Level 5",
    icon: "⭐",
    color: "#F59E0B",
    criteria: "level",
    threshold: 5,
    rarity: "common",
    xpBonus: 100,
  },
  {
    slug: "level_10",
    name: "Climbing High",
    description: "Reached Level 10",
    icon: "🚀",
    color: "#8B5CF6",
    criteria: "level",
    threshold: 10,
    rarity: "rare",
    xpBonus: 250,
  },
  {
    slug: "level_25",
    name: "Job Hunt Legend",
    description: "Reached Level 25",
    icon: "🏅",
    color: "#EF4444",
    criteria: "level",
    threshold: 25,
    rarity: "legendary",
    xpBonus: 1000,
  },
];

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case "common":
      return "#9CA3AF";
    case "rare":
      return "#3B82F6";
    case "epic":
      return "#8B5CF6";
    case "legendary":
      return "#EF4444";
    default:
      return "#9CA3AF";
  }
}

export function getRarityGlow(rarity: string): string {
  switch (rarity) {
    case "rare":
      return "0 0 10px rgba(59, 130, 246, 0.5)";
    case "epic":
      return "0 0 15px rgba(139, 92, 246, 0.6)";
    case "legendary":
      return "0 0 20px rgba(239, 68, 68, 0.7), 0 0 40px rgba(239, 68, 68, 0.3)";
    default:
      return "none";
  }
}
