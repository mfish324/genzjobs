import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isStreakActive,
  shouldIncrementStreak,
  getStreakMultiplier,
  getStreakEmoji,
  getStreakMessage,
} from "@/lib/streaks";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastStreakDate: true,
        xp: true,
        level: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const streakActive = isStreakActive(user.lastStreakDate);
    const currentStreak = streakActive ? user.currentStreak : 0;
    const multiplier = getStreakMultiplier(currentStreak);

    return NextResponse.json({
      currentStreak,
      longestStreak: user.longestStreak,
      multiplier,
      multiplierPercent: Math.round((multiplier - 1) * 100),
      isActive: streakActive,
      emoji: getStreakEmoji(currentStreak),
      message: getStreakMessage(currentStreak),
      lastStreakDate: user.lastStreakDate,
    });
  } catch (error) {
    console.error("Streak fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch streak" }, { status: 500 });
  }
}

// Called to check-in for the day (e.g., on login or daily action)
export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastStreakDate: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const now = new Date();
    let newStreak = user.currentStreak;
    let streakIncremented = false;

    if (shouldIncrementStreak(user.lastStreakDate)) {
      // New day, increment streak
      newStreak = user.currentStreak + 1;
      streakIncremented = true;
    } else if (!isStreakActive(user.lastStreakDate)) {
      // Streak broken, reset to 1
      newStreak = 1;
      streakIncremented = true;
    }
    // else: Same day, no change

    if (streakIncremented) {
      const newLongest = Math.max(newStreak, user.longestStreak);

      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastStreakDate: now,
          lastLoginAt: now,
        },
      });

      const multiplier = getStreakMultiplier(newStreak);

      return NextResponse.json({
        currentStreak: newStreak,
        longestStreak: newLongest,
        multiplier,
        multiplierPercent: Math.round((multiplier - 1) * 100),
        streakIncremented: true,
        emoji: getStreakEmoji(newStreak),
        message: getStreakMessage(newStreak),
      });
    }

    // No change needed
    const multiplier = getStreakMultiplier(user.currentStreak);
    return NextResponse.json({
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      multiplier,
      multiplierPercent: Math.round((multiplier - 1) * 100),
      streakIncremented: false,
      emoji: getStreakEmoji(user.currentStreak),
      message: getStreakMessage(user.currentStreak),
    });
  } catch (error) {
    console.error("Streak update error:", error);
    return NextResponse.json({ error: "Failed to update streak" }, { status: 500 });
  }
}
