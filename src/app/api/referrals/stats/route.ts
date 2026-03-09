import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const referrals = await prisma.referral.findMany({
      where: { referrerId: session.user.id },
      include: {
        referred: {
          select: { name: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalReferred = referrals.length;
    const totalQualified = referrals.filter((r) => r.status !== "pending").length;
    const totalXpEarned = referrals.reduce((sum, r) => sum + r.referrerXpAwarded, 0);

    return NextResponse.json({
      totalReferred,
      totalQualified,
      totalXpEarned,
      referrals: referrals.map((r) => ({
        id: r.id,
        referredName: r.referred.name,
        status: r.status,
        xpAwarded: r.referrerXpAwarded,
        createdAt: r.createdAt,
        qualifiedAt: r.qualifiedAt,
      })),
    });
  } catch (error) {
    console.error("Referral stats error:", error);
    return NextResponse.json({ error: "Failed to get referral stats" }, { status: 500 });
  }
}
