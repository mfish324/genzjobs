import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Trending = jobs with 10+ saves in the last 24 hours
const TRENDING_THRESHOLD = 10;
const TRENDING_WINDOW_HOURS = 24;

export async function GET() {
  try {
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - TRENDING_WINDOW_HOURS);

    // Get job IDs with 10+ saves in the last 24 hours
    const trendingJobs = await prisma.savedJob.groupBy({
      by: ["jobListingId"],
      where: {
        savedAt: {
          gte: windowStart,
        },
      },
      _count: {
        jobListingId: true,
      },
      having: {
        jobListingId: {
          _count: {
            gte: TRENDING_THRESHOLD,
          },
        },
      },
    });

    const trendingIds = trendingJobs.map((job) => job.jobListingId);

    return NextResponse.json({
      trendingIds,
      count: trendingIds.length,
      threshold: TRENDING_THRESHOLD,
      windowHours: TRENDING_WINDOW_HOURS,
    });
  } catch (error) {
    console.error("Trending jobs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending jobs", trendingIds: [] },
      { status: 500 }
    );
  }
}
