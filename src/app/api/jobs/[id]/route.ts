import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const job = await prisma.jobListing.findUnique({
      where: { id },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Check if current user has already applied
    const session = await getServerSession(authOptions);
    let hasApplied = false;

    if (session?.user?.id) {
      const application = await prisma.application.findUnique({
        where: {
          userId_jobListingId: {
            userId: session.user.id,
            jobListingId: id,
          },
        },
      });
      hasApplied = !!application;
    }

    return NextResponse.json({
      ...job,
      hasApplied,
      applicationsCount: job._count.applications,
    });
  } catch (error) {
    console.error("Job fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}
