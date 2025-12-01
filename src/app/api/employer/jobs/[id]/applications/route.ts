import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    // Verify employer owns this job
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

    // Get applications for this job
    const applications = await prisma.employerApplication.findMany({
      where: { employerJobPostingId: jobId },
      orderBy: { appliedAt: "desc" },
    });

    return NextResponse.json({ job, applications });
  } catch (error) {
    console.error("Applications fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}
