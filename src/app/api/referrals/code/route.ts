import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateReferralCode(name: string): string {
  const cleanName = (name || "USER").replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 6);
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${cleanName}-${suffix}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { referralCode: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate code if user doesn't have one
    let code = user.referralCode;
    if (!code) {
      code = generateReferralCode(user.name || "");

      // Ensure uniqueness
      let attempts = 0;
      while (attempts < 5) {
        const existing = await prisma.user.findUnique({
          where: { referralCode: code },
        });
        if (!existing) break;
        code = generateReferralCode(user.name || "");
        attempts++;
      }

      await prisma.user.update({
        where: { id: session.user.id },
        data: { referralCode: code },
      });
    }

    return NextResponse.json({ code });
  } catch (error) {
    console.error("Referral code error:", error);
    return NextResponse.json({ error: "Failed to get referral code" }, { status: 500 });
  }
}
