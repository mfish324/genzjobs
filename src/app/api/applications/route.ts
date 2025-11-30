import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { XP_REWARDS, calculateLevel } from "@/lib/constants";

const applicationSchema = z.object({
  jobListingId: z.string(),
  notes: z.string().optional(),
  resumeUrl: z.string().optional(),
  coverLetter: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const applications = await prisma.application.findMany({
      where: { userId: session.user.id },
      include: {
        jobListing: {
          select: {
            id: true,
            title: true,
            company: true,
            companyLogo: true,
            location: true,
            jobType: true,
            remote: true,
          },
        },
      },
      orderBy: { appliedAt: "desc" },
    });

    return NextResponse.json(applications);
  } catch (error) {
    console.error("Applications fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { jobListingId, notes, resumeUrl, coverLetter } = applicationSchema.parse(body);

    // Check if job exists
    const job = await prisma.jobListing.findUnique({
      where: { id: jobListingId },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Check if already applied
    const existingApplication = await prisma.application.findUnique({
      where: {
        userId_jobListingId: {
          userId: session.user.id,
          jobListingId,
        },
      },
    });

    if (existingApplication) {
      return NextResponse.json({ error: "Already applied to this job" }, { status: 400 });
    }

    // Calculate XP based on job difficulty
    const xpEarned = XP_REWARDS.JOB_APPLICATION * job.difficultyLevel;

    // Create application and update user XP in transaction
    const [application] = await prisma.$transaction([
      prisma.application.create({
        data: {
          userId: session.user.id,
          jobListingId,
          notes,
          resumeUrl,
          coverLetter,
          xpEarned,
        },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          xp: { increment: xpEarned },
          level: calculateLevel((session.user.xp || 0) + xpEarned),
        },
      }),
      prisma.xpTransaction.create({
        data: {
          userId: session.user.id,
          amount: xpEarned,
          type: "application",
          description: `Applied to ${job.title} at ${job.company}`,
          referenceId: jobListingId,
          referenceType: "application",
        },
      }),
    ]);

    // Update quest progress (apply_jobs action)
    await updateQuestProgress(session.user.id, "apply_jobs");

    return NextResponse.json({ application, xpEarned }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Application error:", error);
    return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
  }
}

async function updateQuestProgress(userId: string, action: string) {
  // Get active quests for this action
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const quests = await prisma.quest.findMany({
    where: {
      action,
      isActive: true,
    },
  });

  for (const quest of quests) {
    let periodStart: Date | null = null;

    if (quest.type === "daily") {
      periodStart = today;
    } else if (quest.type === "weekly") {
      periodStart = weekStart;
    }

    // Find or create user quest
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

      // Award XP if quest completed
      if (isCompleted) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: userId },
            data: { xp: { increment: quest.xpReward } },
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
      }
    } else if (quest.type !== "milestone") {
      // Create new quest progress for daily/weekly
      await prisma.userQuest.create({
        data: {
          userId,
          questId: quest.id,
          progress: 1,
          periodStart,
          isCompleted: quest.targetCount === 1,
          ...(quest.targetCount === 1 && { completedAt: new Date() }),
        },
      });

      // Award XP if single-target quest
      if (quest.targetCount === 1) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: userId },
            data: { xp: { increment: quest.xpReward } },
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
      }
    }
  }
}
