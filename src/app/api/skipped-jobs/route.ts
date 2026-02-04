import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Record a skipped job for algorithm training
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jobListingId, reason } = await req.json();

    if (!jobListingId) {
      return NextResponse.json(
        { error: "Job listing ID is required" },
        { status: 400 }
      );
    }

    // Check if job exists
    const job = await prisma.jobListing.findUnique({
      where: { id: jobListingId },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Check if already skipped
    const existing = await prisma.skippedJob.findUnique({
      where: {
        userId_jobListingId: {
          userId: session.user.id,
          jobListingId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Job already skipped" },
        { status: 400 }
      );
    }

    // Create skipped job record
    const skippedJob = await prisma.skippedJob.create({
      data: {
        userId: session.user.id,
        jobListingId,
      },
    });

    return NextResponse.json(skippedJob, { status: 201 });
  } catch (error) {
    console.error("Skip job error:", error);
    return NextResponse.json(
      { error: "Failed to skip job" },
      { status: 500 }
    );
  }
}

// Get user's skipped jobs (for filtering)
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const skippedJobs = await prisma.skippedJob.findMany({
      where: { userId: session.user.id },
      select: { jobListingId: true },
    });

    return NextResponse.json(skippedJobs.map((sj) => sj.jobListingId));
  } catch (error) {
    console.error("Get skipped jobs error:", error);
    return NextResponse.json(
      { error: "Failed to get skipped jobs" },
      { status: 500 }
    );
  }
}
