import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const search = searchParams.get("search") || "";
  const location = searchParams.get("location") || "";
  const jobType = searchParams.get("jobType") || "";
  const experienceLevel = searchParams.get("experienceLevel") || "";
  const category = searchParams.get("category") || "";
  const remote = searchParams.get("remote") === "true";
  const usOnly = searchParams.get("usOnly") === "true";

  // Build where clause matching the main jobs query
  const where: Record<string, unknown> = {
    isActive: true,
  };

  // US only filter - show US jobs OR remote jobs from anywhere
  if (usOnly) {
    where.AND = [
      ...(where.AND as unknown[] || []),
      {
        OR: [
          { country: "US" },
          { remote: true },
        ],
      },
    ];
  }

  if (search) {
    where.AND = [
      ...(where.AND as unknown[] || []),
      {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }

  if (location) {
    where.location = { contains: location, mode: "insensitive" };
  }

  if (jobType) {
    where.jobType = jobType;
  }

  if (experienceLevel) {
    where.experienceLevel = experienceLevel;
  }

  if (category) {
    where.category = category;
  }

  if (remote) {
    where.remote = true;
  }

  try {
    // Get top employers with job counts
    const employerCounts = await prisma.jobListing.groupBy({
      by: ["company"],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 15,
    });

    // Get top skills with counts
    const jobs = await prisma.jobListing.findMany({
      where,
      select: {
        skills: true,
      },
    });

    // Aggregate skills manually since Prisma doesn't support groupBy on array fields
    const skillCounts: Record<string, number> = {};
    for (const job of jobs) {
      for (const skill of job.skills) {
        const normalizedSkill = skill.trim();
        if (normalizedSkill) {
          skillCounts[normalizedSkill] = (skillCounts[normalizedSkill] || 0) + 1;
        }
      }
    }

    // Sort skills by count and take top 15
    const topSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }));

    // Get job type counts
    const jobTypeCounts = await prisma.jobListing.groupBy({
      by: ["jobType"],
      where: {
        ...where,
        jobType: { not: null },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    // Get experience level counts
    const experienceCounts = await prisma.jobListing.groupBy({
      by: ["experienceLevel"],
      where: {
        ...where,
        experienceLevel: { not: null },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    return NextResponse.json({
      employers: employerCounts.map((e) => ({
        name: e.company,
        count: e._count.id,
      })),
      skills: topSkills,
      jobTypes: jobTypeCounts
        .filter((jt) => jt.jobType)
        .map((jt) => ({
          name: jt.jobType!,
          count: jt._count.id,
        })),
      experienceLevels: experienceCounts
        .filter((el) => el.experienceLevel)
        .map((el) => ({
          name: el.experienceLevel!,
          count: el._count.id,
        })),
    });
  } catch (error) {
    console.error("Facets fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch facets" }, { status: 500 });
  }
}
