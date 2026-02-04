import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateLevel } from "@/lib/constants";

// XP rewards for each wheel segment
const WHEEL_SEGMENTS = [10, 25, 50, 15, 100, 20, 35, 200];

// Weighted probabilities (higher = more likely)
const SEGMENT_WEIGHTS = [25, 20, 10, 22, 3, 18, 12, 2];

function getRandomSegment(): number {
  const totalWeight = SEGMENT_WEIGHTS.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < SEGMENT_WEIGHTS.length; i++) {
    random -= SEGMENT_WEIGHTS[i];
    if (random <= 0) {
      return i;
    }
  }

  return 0; // Fallback
}

// Check spin status
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { lastSpinDate: true },
    });

    // Get most recent spin
    const lastSpin = await prisma.dailySpin.findFirst({
      where: { userId: session.user.id },
      orderBy: { spinDate: "desc" },
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const canSpin = !user?.lastSpinDate || new Date(user.lastSpinDate) < today;

    // Calculate next spin time (midnight local time)
    const nextSpinAt = canSpin
      ? null
      : new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();

    return NextResponse.json({
      canSpin,
      nextSpinAt,
      lastXpWon: lastSpin?.xpAmount || null,
    });
  } catch (error) {
    console.error("Daily spin status error:", error);
    return NextResponse.json(
      { error: "Failed to get spin status" },
      { status: 500 }
    );
  }
}

// Spin the wheel
export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { lastSpinDate: true, xp: true, currentStreak: true },
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if user can spin today
    if (user?.lastSpinDate && new Date(user.lastSpinDate) >= today) {
      const nextSpinAt = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      return NextResponse.json(
        {
          error: "You've already spun today!",
          nextSpinAt: nextSpinAt.toISOString(),
        },
        { status: 400 }
      );
    }

    // Determine winning segment
    const segment = getRandomSegment();
    let xpAmount = WHEEL_SEGMENTS[segment];

    // Apply streak bonus for consecutive daily spins (max 1.25x)
    const streakBonus = Math.min(1 + (user?.currentStreak || 0) * 0.05, 1.25);
    xpAmount = Math.floor(xpAmount * streakBonus);

    // Update user and create spin record
    const nextSpinAt = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          xp: { increment: xpAmount },
          level: calculateLevel((user?.xp || 0) + xpAmount),
          lastSpinDate: now,
        },
      }),
      prisma.dailySpin.create({
        data: {
          userId: session.user.id,
          xpAmount: xpAmount,
          streakMultiplier: streakBonus,
        },
      }),
      prisma.xpTransaction.create({
        data: {
          userId: session.user.id,
          amount: xpAmount,
          type: "daily_spin",
          description: `Daily spin reward${streakBonus > 1 ? ` (${streakBonus.toFixed(2)}x streak bonus)` : ""}`,
          referenceType: "daily_spin",
        },
      }),
    ]);

    return NextResponse.json({
      xpAmount,
      segment,
      nextSpinAt: nextSpinAt.toISOString(),
      streakBonus: streakBonus > 1 ? streakBonus : null,
    });
  } catch (error) {
    console.error("Daily spin error:", error);
    return NextResponse.json(
      { error: "Failed to spin the wheel" },
      { status: 500 }
    );
  }
}
