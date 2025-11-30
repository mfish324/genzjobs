import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rewards = await prisma.reward.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { xpCost: "asc" }],
    });

    return NextResponse.json(rewards);
  } catch (error) {
    console.error("Rewards fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch rewards" }, { status: 500 });
  }
}

const redeemSchema = z.object({
  rewardId: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { rewardId } = redeemSchema.parse(body);

    // Get reward
    const reward = await prisma.reward.findUnique({
      where: { id: rewardId },
    });

    if (!reward || !reward.isActive) {
      return NextResponse.json({ error: "Reward not found" }, { status: 404 });
    }

    // Check quantity
    if (reward.quantity !== null && reward.quantity <= 0) {
      return NextResponse.json({ error: "Reward is out of stock" }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { xp: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check XP balance
    if (user.xp < reward.xpCost) {
      return NextResponse.json(
        { error: "Not enough XP. Keep completing quests!" },
        { status: 400 }
      );
    }

    // Create redemption in transaction
    const [userReward] = await prisma.$transaction([
      prisma.userReward.create({
        data: {
          userId: session.user.id,
          rewardId,
          xpSpent: reward.xpCost,
          status: "pending",
        },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { xp: { decrement: reward.xpCost } },
      }),
      prisma.xpTransaction.create({
        data: {
          userId: session.user.id,
          amount: -reward.xpCost,
          type: "reward_redemption",
          description: `Redeemed: ${reward.title}`,
          referenceId: rewardId,
          referenceType: "reward",
        },
      }),
      // Decrement quantity if limited
      ...(reward.quantity !== null
        ? [
            prisma.reward.update({
              where: { id: rewardId },
              data: { quantity: { decrement: 1 } },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({
      userReward,
      message: "Reward redeemed successfully! We'll be in touch soon.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Redeem error:", error);
    return NextResponse.json({ error: "Failed to redeem reward" }, { status: 500 });
  }
}
