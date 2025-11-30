import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeJobMatch } from "@/lib/ai";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Get job details
    const job = await prisma.jobListing.findUnique({
      where: { id },
      select: {
        title: true,
        description: true,
        skills: true,
        experienceLevel: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Get user profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        skills: true,
        experience: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Analyze match
    const match = await analyzeJobMatch(
      user.skills,
      user.experience,
      job.title,
      job.description,
      job.skills,
      job.experienceLevel
    );

    return NextResponse.json(match);
  } catch (error) {
    console.error("Job match analysis error:", error);
    return NextResponse.json({ error: "Failed to analyze match" }, { status: 500 });
  }
}
