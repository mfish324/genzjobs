import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BADGE_DEFINITIONS } from "@/lib/badges";

// Get user's badges
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userBadges = await prisma.userBadge.findMany({
      where: { userId: session.user.id },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
    });

    // Get all badges for progress tracking
    const allBadges = await prisma.badge.findMany({
      where: { isActive: true },
    });

    // Get user stats for progress
    const [
      applicationCount,
      savedJobCount,
      questsCompleted,
      eventsAttended,
      jamSessions,
      user,
    ] = await Promise.all([
      prisma.application.count({ where: { userId: session.user.id } }),
      prisma.savedJob.count({ where: { userId: session.user.id } }),
      prisma.userQuest.count({ where: { userId: session.user.id, isCompleted: true } }),
      prisma.eventRegistration.count({
        where: { userId: session.user.id, status: "attended" },
      }),
      prisma.jamParticipant.count({ where: { userId: session.user.id } }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          level: true,
          currentStreak: true,
          longestStreak: true,
          resume: { select: { id: true } },
          skills: true,
          bio: true,
        },
      }),
    ]);

    const interviewCount = await prisma.application.count({
      where: { userId: session.user.id, status: "interviewing" },
    });

    const offerCount = await prisma.application.count({
      where: { userId: session.user.id, status: "offered" },
    });

    // Calculate progress for each badge
    const earnedSlugs = new Set(userBadges.map((ub) => ub.badge.slug));

    const badgesWithProgress = allBadges.map((badge) => {
      let currentProgress = 0;

      switch (badge.criteria) {
        case "applications":
          currentProgress = applicationCount;
          break;
        case "streak":
          currentProgress = user?.longestStreak || 0;
          break;
        case "interviews":
          currentProgress = interviewCount;
          break;
        case "offers":
          currentProgress = offerCount;
          break;
        case "saved_jobs":
          currentProgress = savedJobCount;
          break;
        case "quests_completed":
          currentProgress = questsCompleted;
          break;
        case "events_attended":
          currentProgress = eventsAttended;
          break;
        case "jam_sessions":
          currentProgress = jamSessions;
          break;
        case "level":
          currentProgress = user?.level || 1;
          break;
        case "profile_complete":
          currentProgress =
            user?.skills?.length && user?.bio ? 1 : 0;
          break;
        case "resume_uploaded":
          currentProgress = user?.resume ? 1 : 0;
          break;
      }

      const earned = earnedSlugs.has(badge.slug);
      const progress = Math.min(currentProgress / badge.threshold, 1);

      return {
        ...badge,
        earned,
        currentProgress,
        progress,
        earnedAt: earned
          ? userBadges.find((ub) => ub.badge.slug === badge.slug)?.earnedAt
          : null,
      };
    });

    return NextResponse.json({
      earned: badgesWithProgress.filter((b) => b.earned),
      available: badgesWithProgress.filter((b) => !b.earned),
      totalEarned: userBadges.length,
      totalAvailable: allBadges.length,
    });
  } catch (error) {
    console.error("Badges fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch badges" }, { status: 500 });
  }
}

// Check and award badges (call after relevant actions)
export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ensure all badge definitions exist in DB
    for (const def of BADGE_DEFINITIONS) {
      await prisma.badge.upsert({
        where: { slug: def.slug },
        create: def,
        update: {
          name: def.name,
          description: def.description,
          icon: def.icon,
          color: def.color,
          criteria: def.criteria,
          threshold: def.threshold,
          rarity: def.rarity,
          xpBonus: def.xpBonus,
        },
      });
    }

    // Get user's current badges
    const existingBadges = await prisma.userBadge.findMany({
      where: { userId: session.user.id },
      select: { badge: { select: { slug: true } } },
    });
    const earnedSlugs = new Set(existingBadges.map((eb) => eb.badge.slug));

    // Get user stats
    const [
      applicationCount,
      savedJobCount,
      questsCompleted,
      eventsAttended,
      jamSessions,
      user,
    ] = await Promise.all([
      prisma.application.count({ where: { userId: session.user.id } }),
      prisma.savedJob.count({ where: { userId: session.user.id } }),
      prisma.userQuest.count({ where: { userId: session.user.id, isCompleted: true } }),
      prisma.eventRegistration.count({
        where: { userId: session.user.id, status: "attended" },
      }),
      prisma.jamParticipant.count({ where: { userId: session.user.id } }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          level: true,
          currentStreak: true,
          longestStreak: true,
          xp: true,
          resume: { select: { id: true } },
          skills: true,
          bio: true,
        },
      }),
    ]);

    const interviewCount = await prisma.application.count({
      where: { userId: session.user.id, status: "interviewing" },
    });

    const offerCount = await prisma.application.count({
      where: { userId: session.user.id, status: "offered" },
    });

    // Check each badge criteria
    const newBadges: { slug: string; xpBonus: number }[] = [];

    for (const def of BADGE_DEFINITIONS) {
      if (earnedSlugs.has(def.slug)) continue;

      let meetsThreshold = false;

      switch (def.criteria) {
        case "applications":
          meetsThreshold = applicationCount >= def.threshold;
          break;
        case "streak":
          meetsThreshold = (user?.longestStreak || 0) >= def.threshold;
          break;
        case "interviews":
          meetsThreshold = interviewCount >= def.threshold;
          break;
        case "offers":
          meetsThreshold = offerCount >= def.threshold;
          break;
        case "saved_jobs":
          meetsThreshold = savedJobCount >= def.threshold;
          break;
        case "quests_completed":
          meetsThreshold = questsCompleted >= def.threshold;
          break;
        case "events_attended":
          meetsThreshold = eventsAttended >= def.threshold;
          break;
        case "jam_sessions":
          meetsThreshold = jamSessions >= def.threshold;
          break;
        case "level":
          meetsThreshold = (user?.level || 1) >= def.threshold;
          break;
        case "profile_complete":
          meetsThreshold = !!(user?.skills?.length && user?.bio);
          break;
        case "resume_uploaded":
          meetsThreshold = !!user?.resume;
          break;
      }

      if (meetsThreshold) {
        const badge = await prisma.badge.findUnique({ where: { slug: def.slug } });
        if (badge) {
          await prisma.userBadge.create({
            data: {
              userId: session.user.id,
              badgeId: badge.id,
            },
          });
          newBadges.push({ slug: def.slug, xpBonus: def.xpBonus });
        }
      }
    }

    // Award XP for new badges
    if (newBadges.length > 0) {
      const totalXP = newBadges.reduce((sum, b) => sum + b.xpBonus, 0);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: session.user.id },
          data: { xp: { increment: totalXP } },
        }),
        ...newBadges.map((b) =>
          prisma.xpTransaction.create({
            data: {
              userId: session.user.id,
              amount: b.xpBonus,
              type: "badge",
              description: `Earned badge: ${b.slug}`,
              referenceType: "badge",
              referenceId: b.slug,
            },
          })
        ),
      ]);
    }

    return NextResponse.json({
      newBadges,
      totalXPEarned: newBadges.reduce((sum, b) => sum + b.xpBonus, 0),
    });
  } catch (error) {
    console.error("Badge check error:", error);
    return NextResponse.json({ error: "Failed to check badges" }, { status: 500 });
  }
}
