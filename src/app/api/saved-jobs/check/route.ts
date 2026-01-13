import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ savedJobIds: [] });
  }

  try {
    const { searchParams } = new URL(req.url);
    const jobIds = searchParams.get("jobIds");

    if (!jobIds) {
      // Return all saved job IDs for the user
      const savedJobs = await prisma.savedJob.findMany({
        where: { userId: session.user.id },
        select: { jobListingId: true },
      });

      return NextResponse.json({
        savedJobIds: savedJobs.map((s) => s.jobListingId),
      });
    }

    // Check specific job IDs
    const ids = jobIds.split(",");
    const savedJobs = await prisma.savedJob.findMany({
      where: {
        userId: session.user.id,
        jobListingId: { in: ids },
      },
      select: { jobListingId: true },
    });

    return NextResponse.json({
      savedJobIds: savedJobs.map((s) => s.jobListingId),
    });
  } catch (error) {
    console.error("Check saved jobs error:", error);
    return NextResponse.json({ savedJobIds: [] });
  }
}
