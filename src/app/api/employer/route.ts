import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const employer = await prisma.employer.findUnique({
      where: { userId: session.user.id },
      include: {
        jobPostings: {
          include: {
            _count: {
              select: { applications: true },
            },
          },
          orderBy: { postedAt: "desc" },
        },
      },
    });

    return NextResponse.json(employer);
  } catch (error) {
    console.error("Employer fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch employer" }, { status: 500 });
  }
}

const employerSchema = z.object({
  companyName: z.string().min(2),
  website: z.string().url().optional().or(z.literal("")),
  industry: z.string().optional(),
  size: z.string().optional(),
  description: z.string().optional(),
  headquarters: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = employerSchema.parse(body);

    // Check if already an employer
    const existing = await prisma.employer.findUnique({
      where: { userId: session.user.id },
    });

    if (existing) {
      return NextResponse.json({ error: "Already registered as employer" }, { status: 400 });
    }

    const employer = await prisma.employer.create({
      data: {
        userId: session.user.id,
        ...data,
        website: data.website || null,
      },
    });

    return NextResponse.json(employer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Employer create error:", error);
    return NextResponse.json({ error: "Failed to create employer" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = employerSchema.parse(body);

    const employer = await prisma.employer.update({
      where: { userId: session.user.id },
      data: {
        ...data,
        website: data.website || null,
      },
    });

    return NextResponse.json(employer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Employer update error:", error);
    return NextResponse.json({ error: "Failed to update employer" }, { status: 500 });
  }
}
