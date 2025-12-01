import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const jobPostingSchema = z.object({
  title: z.string().min(5),
  location: z.string().optional(),
  jobType: z.string().optional(),
  experienceLevel: z.string().optional(),
  description: z.string().min(50),
  requirements: z.string().optional(),
  responsibilities: z.string().optional(),
  benefits: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  salaryCurrency: z.string().optional(),
  salaryPeriod: z.string().optional(),
  skills: z.array(z.string()).optional(),
  remote: z.boolean().optional(),
  applicationInstructions: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get employer
    const employer = await prisma.employer.findUnique({
      where: { userId: session.user.id },
    });

    if (!employer) {
      return NextResponse.json({ error: "Not registered as employer" }, { status: 403 });
    }

    const body = await req.json();
    const data = jobPostingSchema.parse(body);

    const jobPosting = await prisma.employerJobPosting.create({
      data: {
        employerId: employer.id,
        ...data,
        skills: data.skills || [],
      },
    });

    return NextResponse.json(jobPosting, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }

    console.error("Job posting create error:", error);
    return NextResponse.json({ error: "Failed to create job posting" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const employer = await prisma.employer.findUnique({
      where: { userId: session.user.id },
    });

    if (!employer) {
      return NextResponse.json({ error: "Not registered as employer" }, { status: 403 });
    }

    const jobPostings = await prisma.employerJobPosting.findMany({
      where: { employerId: employer.id },
      include: {
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { postedAt: "desc" },
    });

    return NextResponse.json(jobPostings);
  } catch (error) {
    console.error("Job postings fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch job postings" }, { status: 500 });
  }
}
