import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { optIn } = await req.json();

    // Check if user has a resume
    const resume = await prisma.resume.findUnique({
      where: { userId: session.user.id },
    });

    if (!resume) {
      return NextResponse.json(
        { error: "No resume uploaded. Please upload your resume first." },
        { status: 400 }
      );
    }

    // Update opt-in status
    const updatedResume = await prisma.resume.update({
      where: { userId: session.user.id },
      data: {
        allowComparison: optIn,
        comparisonOptInAt: optIn ? new Date() : null,
        // Reset scores when opting out
        ...(optIn === false && {
          uniquenessScore: null,
          similarCount90: null,
          similarCount80: null,
          lastAnalyzedAt: null,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      allowComparison: updatedResume.allowComparison,
      comparisonOptInAt: updatedResume.comparisonOptInAt,
    });
  } catch (error) {
    console.error("Resume opt-in error:", error);
    return NextResponse.json(
      { error: "Failed to update comparison preferences" },
      { status: 500 }
    );
  }
}
