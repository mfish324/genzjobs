import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findSimilarJobs } from "@/lib/ai";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = req.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") || "6");

  try {
    // Get the source job
    const sourceJob = await prisma.jobListing.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        company: true,
        description: true,
        skills: true,
        category: true,
        jobType: true,
        experienceLevel: true,
        location: true,
        remote: true,
      },
    });

    if (!sourceJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // First pass: Database query to find candidate similar jobs
    // Filter by same category, overlapping skills, or similar job type
    const candidateJobs = await prisma.jobListing.findMany({
      where: {
        id: { not: id },
        isActive: true,
        OR: [
          // Same category
          { category: sourceJob.category },
          // Has overlapping skills
          ...(sourceJob.skills.length > 0
            ? [{ skills: { hasSome: sourceJob.skills } }]
            : []),
          // Same job type
          ...(sourceJob.jobType ? [{ jobType: sourceJob.jobType }] : []),
        ],
      },
      select: {
        id: true,
        title: true,
        company: true,
        companyLogo: true,
        description: true,
        skills: true,
        category: true,
        jobType: true,
        experienceLevel: true,
        location: true,
        remote: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        salaryPeriod: true,
        postedAt: true,
        applyUrl: true,
        publisher: true,
      },
      orderBy: { postedAt: "desc" },
      take: 30, // Get more candidates for AI scoring
    });

    if (candidateJobs.length === 0) {
      return NextResponse.json({
        similarJobs: [],
        totalSimilar: 0,
      });
    }

    // Calculate similarity scores
    const scoredJobs = await findSimilarJobs(sourceJob, candidateJobs);

    // Filter to jobs with high similarity (>= 70%)
    const highSimilarityJobs = scoredJobs.filter((job) => job.score >= 70);
    const totalSimilar = highSimilarityJobs.length;

    // Return top N similar jobs
    const topSimilar = highSimilarityJobs.slice(0, limit);

    return NextResponse.json({
      similarJobs: topSimilar.map((job) => ({
        ...job.job,
        similarityScore: job.score,
        matchReasons: job.reasons,
      })),
      totalSimilar,
    });
  } catch (error) {
    console.error("Similar jobs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch similar jobs" },
      { status: 500 }
    );
  }
}
