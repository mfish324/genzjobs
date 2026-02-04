import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ quest: null });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  try {
    // Get all active quests
    const quests = await prisma.quest.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { xpReward: "asc" }],
    });

    // Get user's quest progress
    const userQuests = await prisma.userQuest.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { quest: { type: "daily" }, periodStart: today },
          { quest: { type: "weekly" }, periodStart: weekStart },
          { quest: { type: "milestone" } },
        ],
      },
    });

    // Find the first incomplete quest (prioritize daily, then weekly, then milestone)
    const questsWithProgress = quests.map((quest) => {
      const userQuest = userQuests.find((uq) => uq.questId === quest.id);
      return {
        id: quest.id,
        title: quest.title,
        progress: userQuest?.progress || 0,
        targetCount: quest.targetCount,
        xpReward: quest.xpReward,
        type: quest.type as "daily" | "weekly" | "milestone",
        isCompleted: userQuest?.isCompleted || false,
      };
    });

    // Priority: incomplete daily > incomplete weekly > incomplete milestone
    const activeQuest =
      questsWithProgress.find((q) => q.type === "daily" && !q.isCompleted) ||
      questsWithProgress.find((q) => q.type === "weekly" && !q.isCompleted) ||
      questsWithProgress.find((q) => q.type === "milestone" && !q.isCompleted) ||
      null;

    return NextResponse.json({ quest: activeQuest });
  } catch (error) {
    console.error("Active quest fetch error:", error);
    return NextResponse.json({ quest: null });
  }
}
