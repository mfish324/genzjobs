import { prisma } from "@/lib/prisma";
import { calculateLevel } from "@/lib/constants";

/**
 * Update quest progress for a given user and action.
 * Returns array of completed quest titles (for toast notifications).
 */
export async function updateQuestProgress(
  userId: string,
  action: string
): Promise<string[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const quests = await prisma.quest.findMany({
    where: { action, isActive: true },
  });

  const completedQuests: string[] = [];

  for (const quest of quests) {
    let periodStart: Date | null = null;

    if (quest.type === "daily") {
      periodStart = today;
    } else if (quest.type === "weekly") {
      periodStart = weekStart;
    }

    // Find existing user quest
    const existingUserQuest = await prisma.userQuest.findFirst({
      where: {
        userId,
        questId: quest.id,
        ...(periodStart && { periodStart }),
        isCompleted: false,
      },
    });

    if (existingUserQuest) {
      const newProgress = existingUserQuest.progress + 1;
      const isCompleted = newProgress >= quest.targetCount;

      await prisma.userQuest.update({
        where: { id: existingUserQuest.id },
        data: {
          progress: newProgress,
          isCompleted,
          ...(isCompleted && { completedAt: new Date() }),
        },
      });

      if (isCompleted) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { xp: true },
        });
        const newXp = (user?.xp || 0) + quest.xpReward;
        await prisma.$transaction([
          prisma.user.update({
            where: { id: userId },
            data: {
              xp: { increment: quest.xpReward },
              level: calculateLevel(newXp),
            },
          }),
          prisma.xpTransaction.create({
            data: {
              userId,
              amount: quest.xpReward,
              type: "quest",
              description: `Completed quest: ${quest.title}`,
              referenceId: quest.id,
              referenceType: "quest",
            },
          }),
        ]);
        completedQuests.push(quest.title);
      }
    } else if (quest.type !== "milestone") {
      const isCompleted = quest.targetCount === 1;
      await prisma.userQuest.create({
        data: {
          userId,
          questId: quest.id,
          progress: 1,
          periodStart,
          isCompleted,
          ...(isCompleted && { completedAt: new Date() }),
        },
      });

      if (isCompleted) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { xp: true },
        });
        const newXp = (user?.xp || 0) + quest.xpReward;
        await prisma.$transaction([
          prisma.user.update({
            where: { id: userId },
            data: {
              xp: { increment: quest.xpReward },
              level: calculateLevel(newXp),
            },
          }),
          prisma.xpTransaction.create({
            data: {
              userId,
              amount: quest.xpReward,
              type: "quest",
              description: `Completed quest: ${quest.title}`,
              referenceId: quest.id,
              referenceType: "quest",
            },
          }),
        ]);
        completedQuests.push(quest.title);
      }
    }
  }

  return completedQuests;
}
