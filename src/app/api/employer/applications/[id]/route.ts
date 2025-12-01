import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  status: z.enum(["pending", "reviewing", "interviewed", "offered", "hired", "rejected"]),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: applicationId } = await params;

    // Verify employer
    const employer = await prisma.employer.findUnique({
      where: { userId: session.user.id },
    });

    if (!employer) {
      return NextResponse.json({ error: "Not registered as employer" }, { status: 403 });
    }

    // Get application and verify ownership
    const application = await prisma.employerApplication.findUnique({
      where: { id: applicationId },
      include: {
        jobPosting: true,
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (application.jobPosting.employerId !== employer.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const updated = await prisma.employerApplication.update({
      where: { id: applicationId },
      data: {
        status: data.status,
        notes: data.notes,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }

    console.error("Application update error:", error);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}
