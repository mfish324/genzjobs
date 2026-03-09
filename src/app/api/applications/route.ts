import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { XP_REWARDS, calculateLevel } from "@/lib/constants";
import { calculateStreakXP, getStreakMultiplier } from "@/lib/streaks";
import { updateQuestProgress } from "@/lib/quest-progress";

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

    // Get user's current streak for multiplier
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { currentStreak: true, xp: true },
    });

    // Calculate XP based on job difficulty and streak multiplier
    const baseXP = XP_REWARDS.JOB_APPLICATION * job.difficultyLevel;
    const streakDays = user?.currentStreak || 0;
    const xpEarned = calculateStreakXP(baseXP, streakDays);
    const multiplier = getStreakMultiplier(streakDays);

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
          level: calculateLevel((user?.xp || 0) + xpEarned),
        },
      }),
      prisma.xpTransaction.create({
        data: {
          userId: session.user.id,
          amount: xpEarned,
          type: "application",
          description: multiplier > 1
            ? `Applied to ${job.title} at ${job.company} (${multiplier}x streak bonus!)`
            : `Applied to ${job.title} at ${job.company}`,
          referenceId: jobListingId,
          referenceType: "application",
        },
      }),
    ]);

    // Update quest progress (apply_jobs action)
    const completedQuests = await updateQuestProgress(session.user.id, "apply_jobs");

    // Check referral qualification (first application triggers referral reward)
    const existingAppCount = await prisma.application.count({
      where: { userId: session.user.id },
    });
    if (existingAppCount === 1) {
      // This is the user's first application (we just created it above)
      const pendingReferral = await prisma.referral.findFirst({
        where: { referredId: session.user.id, status: "pending" },
      });

      if (pendingReferral) {
        const REFERRAL_XP = 200;
        await prisma.$transaction([
          // Award referrer
          prisma.user.update({
            where: { id: pendingReferral.referrerId },
            data: { xp: { increment: REFERRAL_XP } },
          }),
          prisma.xpTransaction.create({
            data: {
              userId: pendingReferral.referrerId,
              amount: REFERRAL_XP,
              type: "referral",
              description: "Referral bonus: your friend submitted their first application!",
              referenceId: pendingReferral.id,
              referenceType: "referral",
            },
          }),
          // Award referred user
          prisma.user.update({
            where: { id: session.user.id },
            data: { xp: { increment: REFERRAL_XP } },
          }),
          prisma.xpTransaction.create({
            data: {
              userId: session.user.id,
              amount: REFERRAL_XP,
              type: "referral",
              description: "Referral bonus: applied to your first job!",
              referenceId: pendingReferral.id,
              referenceType: "referral",
            },
          }),
          // Update referral status
          prisma.referral.update({
            where: { id: pendingReferral.id },
            data: {
              status: "rewarded",
              referrerXpAwarded: REFERRAL_XP,
              referredXpAwarded: REFERRAL_XP,
              qualifiedAt: new Date(),
              rewardedAt: new Date(),
            },
          }),
        ]);
      }
    }

    // Check and award any new badges
    try {
      await fetch(new URL("/api/badges", process.env.NEXTAUTH_URL || "http://localhost:3000"), {
        method: "POST",
        headers: { cookie: `next-auth.session-token=${session.user.id}` },
      });
    } catch {
      // Non-critical: badge check can fail silently
    }

    return NextResponse.json({
      application,
      xpEarned,
      baseXP,
      streakMultiplier: multiplier,
      streakDays,
      completedQuests,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }

    console.error("Application error:", error);
    return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
  }
}

