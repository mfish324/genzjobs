// Streak calculation and multiplier logic

export const STREAK_MULTIPLIERS = {
  0: 1.0,   // No streak
  1: 1.0,   // Day 1
  2: 1.1,   // Day 2: +10%
  3: 1.15,  // Day 3: +15%
  4: 1.2,   // Day 4: +20%
  5: 1.25,  // Day 5: +25%
  6: 1.35,  // Day 6: +35%
  7: 1.5,   // Day 7+: +50% (max)
};

export function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 7) return STREAK_MULTIPLIERS[7];
  return STREAK_MULTIPLIERS[streakDays as keyof typeof STREAK_MULTIPLIERS] || 1.0;
}

export function calculateStreakXP(baseXP: number, streakDays: number): number {
  const multiplier = getStreakMultiplier(streakDays);
  return Math.round(baseXP * multiplier);
}

export function isStreakActive(lastStreakDate: Date | null): boolean {
  if (!lastStreakDate) return false;

  const now = new Date();
  const lastDate = new Date(lastStreakDate);

  // Reset time to midnight for comparison
  now.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  // Streak is active if last activity was today or yesterday
  return diffDays <= 1;
}

export function shouldIncrementStreak(lastStreakDate: Date | null): boolean {
  if (!lastStreakDate) return true; // First streak day

  const now = new Date();
  const lastDate = new Date(lastStreakDate);

  now.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  // Increment if it's a new day (diffDays === 1)
  // Return false if same day (already counted) or streak broken (diffDays > 1)
  return diffDays === 1;
}

export function getStreakEmoji(streakDays: number): string {
  if (streakDays >= 30) return "🔥💎";
  if (streakDays >= 14) return "🔥⭐";
  if (streakDays >= 7) return "🔥";
  if (streakDays >= 3) return "✨";
  return "🌱";
}

export function getStreakMessage(streakDays: number): string {
  if (streakDays >= 30) return "Legendary streak! You're unstoppable!";
  if (streakDays >= 14) return "Two weeks strong! Keep crushing it!";
  if (streakDays >= 7) return "Week streak unlocked! +50% XP bonus!";
  if (streakDays >= 3) return "Building momentum! Keep it up!";
  if (streakDays >= 1) return "Streak started! Come back tomorrow!";
  return "Start your streak today!";
}
