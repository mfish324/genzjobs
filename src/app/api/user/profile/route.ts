import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { XP_REWARDS } from "@/lib/constants";

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().optional(),
  experience: z.string().optional(),
  skills: z.array(z.string()).optional(),
  jobTypes: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  remoteOnly: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      bio: true,
      experience: true,
      skills: true,
      jobTypes: true,
      locations: true,
      remoteOnly: true,
      xp: true,
      level: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = profileSchema.parse(body);

    // Check if this is first profile completion for XP bonus
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        bio: true,
        skills: true,
        experience: true,
      },
    });

    const isFirstCompletion =
      existingUser &&
      !existingUser.bio &&
      existingUser.skills.length === 0 &&
      !existingUser.experience &&
      data.bio &&
      (data.skills?.length ?? 0) > 0 &&
      data.experience;

    let xpEarned = 0;

    // Update user profile
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...data,
        ...(isFirstCompletion && {
          xp: { increment: XP_REWARDS.PROFILE_COMPLETION },
        }),
      },
      select: {
        name: true,
        bio: true,
        experience: true,
        skills: true,
        jobTypes: true,
        locations: true,
        remoteOnly: true,
        xp: true,
        level: true,
      },
    });

    // Create XP transaction if first completion
    if (isFirstCompletion) {
      xpEarned = XP_REWARDS.PROFILE_COMPLETION;
      await prisma.xpTransaction.create({
        data: {
          userId: session.user.id,
          amount: XP_REWARDS.PROFILE_COMPLETION,
          type: "bonus",
          description: "Completed profile for the first time!",
        },
      });
    }

    return NextResponse.json({ ...user, xpEarned });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
