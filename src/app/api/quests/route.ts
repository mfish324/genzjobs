import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Deterministic daily quest selection: pick 3 quests (1 easy, 1 normal, 1 hard)
// using date as seed so all users get the same quests each day
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const shuffled = [...arr];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function ensureDailyQuests(userId: string, today: Date) {
  // Check if user already has daily quests for today
  const existingDaily = await prisma.userQuest.findFirst({
    where: {
      userId,
      quest: { type: "daily" },
      periodStart: today,
    },
  });

  if (existingDaily) return; // Already assigned

  // Get all active daily quests grouped by difficulty
  const dailyQuests = await prisma.quest.findMany({
    where: { type: "daily", isActive: true },
  });

  const easy = dailyQuests.filter((q) => q.difficulty === "EASY");
  const normal = dailyQuests.filter((q) => q.difficulty === "NORMAL");
  const hard = dailyQuests.filter((q) => q.difficulty === "HARD");

  // Seed by date for community consistency
  const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

  const picks: typeof dailyQuests = [];
  if (easy.length > 0) picks.push(seededShuffle(easy, dateSeed)[0]);
  if (normal.length > 0) picks.push(seededShuffle(normal, dateSeed + 1)[0]);
  if (hard.length > 0) picks.push(seededShuffle(hard, dateSeed + 2)[0]);

  // Fallback: if we don't have all 3 difficulties, just pick up to 3
  if (picks.length === 0 && dailyQuests.length > 0) {
    picks.push(...seededShuffle(dailyQuests, dateSeed).slice(0, 3));
  }

  // Create UserQuest entries
  if (picks.length > 0) {
    await prisma.userQuest.createMany({
      data: picks.map((quest) => ({
        userId,
        questId: quest.id,
        progress: 0,
        periodStart: today,
      })),
      skipDuplicates: true,
    });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  try {
    // Auto-assign daily quests if none exist for today
    await ensureDailyQuests(session.user.id, today);

    // Get all active quests
    const quests = await prisma.quest.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { xpReward: "desc" }],
    });

    // Get user's quest progress
    const userQuests = await prisma.userQuest.findMany({
      where: {
        userId: session.user.id,
        OR: [
          // Daily quests from today
          { quest: { type: "daily" }, periodStart: today },
          // Weekly quests from this week
          { quest: { type: "weekly" }, periodStart: weekStart },
          // Milestone quests (no period)
          { quest: { type: "milestone" } },
        ],
      },
    });

    // For daily quests, only show the ones assigned to the user today
    const assignedDailyQuestIds = new Set(
      userQuests.filter((uq) => {
        const quest = quests.find((q) => q.id === uq.questId);
        return quest?.type === "daily";
      }).map((uq) => uq.questId)
    );

    // Map quest progress
    const questsWithProgress = quests
      .filter((quest) => {
        // For daily quests, only show assigned ones
        if (quest.type === "daily") return assignedDailyQuestIds.has(quest.id);
        return true;
      })
      .map((quest) => {
        const userQuest = userQuests.find((uq) => uq.questId === quest.id);
        return {
          ...quest,
          progress: userQuest?.progress || 0,
          isCompleted: userQuest?.isCompleted || false,
          completedAt: userQuest?.completedAt,
        };
      });

    // Group by type
    const grouped = {
      daily: questsWithProgress.filter((q) => q.type === "daily"),
      weekly: questsWithProgress.filter((q) => q.type === "weekly"),
      milestone: questsWithProgress.filter((q) => q.type === "milestone"),
    };

    // Calculate stats
    const stats = {
      totalQuests: quests.length,
      completedToday: grouped.daily.filter((q) => q.isCompleted).length,
      completedThisWeek:
        grouped.daily.filter((q) => q.isCompleted).length +
        grouped.weekly.filter((q) => q.isCompleted).length,
      totalMilestonesCompleted: grouped.milestone.filter((q) => q.isCompleted).length,
      dailyProgress: grouped.daily.length
        ? Math.round(
            (grouped.daily.filter((q) => q.isCompleted).length / grouped.daily.length) * 100
          )
        : 0,
    };

    return NextResponse.json({
      quests: grouped,
      stats,
    });
  } catch (error) {
    console.error("Quests fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch quests" }, { status: 500 });
  }
}
