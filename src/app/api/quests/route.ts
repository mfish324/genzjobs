import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    // Map quest progress
    const questsWithProgress = quests.map((quest) => {
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
