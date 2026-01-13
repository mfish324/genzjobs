import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const saveJobSchema = z.object({
  jobListingId: z.string(),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const savedJobs = await prisma.savedJob.findMany({
      where: { userId: session.user.id },
      include: {
        jobListing: {
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
            country: true,
            applyUrl: true,
            postedAt: true,
            isActive: true,
          },
        },
      },
      orderBy: { savedAt: "desc" },
    });

    return NextResponse.json(savedJobs);
  } catch (error) {
    console.error("Saved jobs fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch saved jobs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { jobListingId, notes } = saveJobSchema.parse(body);

    // Check if job exists
    const job = await prisma.jobListing.findUnique({
      where: { id: jobListingId },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Check if already saved
    const existingSave = await prisma.savedJob.findUnique({
      where: {
        userId_jobListingId: {
          userId: session.user.id,
          jobListingId,
        },
      },
    });

    if (existingSave) {
      return NextResponse.json({ error: "Job already saved" }, { status: 400 });
    }

    // Save the job
    const savedJob = await prisma.savedJob.create({
      data: {
        userId: session.user.id,
        jobListingId,
        notes,
      },
      include: {
        jobListing: {
          select: {
            id: true,
            title: true,
            company: true,
          },
        },
      },
    });

    return NextResponse.json(savedJob, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }

    console.error("Save job error:", error);
    return NextResponse.json({ error: "Failed to save job" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const jobListingId = searchParams.get("jobListingId");

    if (!jobListingId) {
      return NextResponse.json({ error: "Job listing ID is required" }, { status: 400 });
    }

    // Delete the saved job
    await prisma.savedJob.deleteMany({
      where: {
        userId: session.user.id,
        jobListingId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unsave job error:", error);
    return NextResponse.json({ error: "Failed to unsave job" }, { status: 500 });
  }
}
