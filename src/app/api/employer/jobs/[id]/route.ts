import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const jobUpdateSchema = z.object({
  title: z.string().min(5).optional(),
  location: z.string().optional(),
  jobType: z.string().optional(),
  experienceLevel: z.string().optional(),
  description: z.string().min(50).optional(),
  requirements: z.string().optional(),
  responsibilities: z.string().optional(),
  benefits: z.string().optional(),
  salaryMin: z.number().optional().nullable(),
  salaryMax: z.number().optional().nullable(),
  salaryCurrency: z.string().optional(),
  salaryPeriod: z.string().optional(),
  skills: z.array(z.string()).optional(),
  remote: z.boolean().optional(),
  applicationInstructions: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: jobId } = await params;

    const employer = await prisma.employer.findUnique({
      where: { userId: session.user.id },
    });

    if (!employer) {
      return NextResponse.json({ error: "Not registered as employer" }, { status: 403 });
    }

    const job = await prisma.employerJobPosting.findFirst({
      where: {
        id: jobId,
        employerId: employer.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("Job fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: jobId } = await params;

    const employer = await prisma.employer.findUnique({
      where: { userId: session.user.id },
    });

    if (!employer) {
      return NextResponse.json({ error: "Not registered as employer" }, { status: 403 });
    }

    // Verify job belongs to employer
    const existingJob = await prisma.employerJobPosting.findFirst({
      where: {
        id: jobId,
        employerId: employer.id,
      },
    });

    if (!existingJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = jobUpdateSchema.parse(body);

    const job = await prisma.employerJobPosting.update({
      where: { id: jobId },
      data,
    });

    return NextResponse.json(job);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }

    console.error("Job update error:", error);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: jobId } = await params;

    const employer = await prisma.employer.findUnique({
      where: { userId: session.user.id },
    });

    if (!employer) {
      return NextResponse.json({ error: "Not registered as employer" }, { status: 403 });
    }

    // Verify job belongs to employer
    const existingJob = await prisma.employerJobPosting.findFirst({
      where: {
        id: jobId,
        employerId: employer.id,
      },
    });

    if (!existingJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    await prisma.employerJobPosting.delete({
      where: { id: jobId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Job delete error:", error);
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}
