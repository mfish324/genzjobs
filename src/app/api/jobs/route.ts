import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const location = searchParams.get("location") || "";
  const jobType = searchParams.get("jobType") || "";
  const experienceLevel = searchParams.get("experienceLevel") || "";
  const category = searchParams.get("category") || "";
  const remote = searchParams.get("remote") === "true";
  const skills = searchParams.get("skills")?.split(",").filter(Boolean) || [];

  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = {
    isActive: true,
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
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

  if (skills.length > 0) {
    where.skills = { hasSome: skills };
  }

  try {
    const [jobs, total] = await Promise.all([
      prisma.jobListing.findMany({
        where,
        orderBy: { postedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          company: true,
          companyLogo: true,
          location: true,
          jobType: true,
          experienceLevel: true,
          category: true,
          salaryMin: true,
          salaryMax: true,
          salaryCurrency: true,
          salaryPeriod: true,
          skills: true,
          remote: true,
          postedAt: true,
          applyUrl: true,
          difficultyLevel: true,
        },
      }),
      prisma.jobListing.count({ where }),
    ]);

    return NextResponse.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Jobs fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
