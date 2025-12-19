import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { analyzeResumeUniqueness } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's resume
    const userResume = await prisma.resume.findUnique({
      where: { userId: session.user.id },
    });

    if (!userResume) {
      return NextResponse.json(
        { error: "No resume uploaded. Please upload your resume first." },
        { status: 400 }
      );
    }

    if (!userResume.allowComparison) {
      return NextResponse.json(
        { error: "Please opt-in to comparison to analyze your resume uniqueness." },
        { status: 400 }
      );
    }

    // Get all other opted-in resumes
    const otherResumes = await prisma.resume.findMany({
      where: {
        allowComparison: true,
        userId: { not: session.user.id },
      },
      select: {
        id: true,
        extractedText: true,
        skills: true,
      },
    });

    if (otherResumes.length === 0) {
      // Not enough resumes to compare
      const result = {
        uniquenessScore: 100,
        similarCount90: 0,
        similarCount80: 0,
        message: "You're one of the first! As more users opt-in, you'll see how unique your resume is.",
        tips: [
          "Keep building your unique skill set",
          "Highlight specific achievements and projects",
          "Use concrete metrics and results in your resume",
        ],
      };

      // Update resume with results
      await prisma.resume.update({
        where: { userId: session.user.id },
        data: {
          uniquenessScore: result.uniquenessScore,
          similarCount90: result.similarCount90,
          similarCount80: result.similarCount80,
          lastAnalyzedAt: new Date(),
        },
      });

      return NextResponse.json(result);
    }

    // Analyze uniqueness
    const analysis = await analyzeResumeUniqueness(
      {
        text: userResume.extractedText,
        skills: userResume.skills,
      },
      otherResumes
    );

    // Update resume with results
    await prisma.resume.update({
      where: { userId: session.user.id },
      data: {
        uniquenessScore: analysis.uniquenessScore,
        similarCount90: analysis.similarCount90,
        similarCount80: analysis.similarCount80,
        lastAnalyzedAt: new Date(),
      },
    });

    return NextResponse.json({
      uniquenessScore: analysis.uniquenessScore,
      similarCount90: analysis.similarCount90,
      similarCount80: analysis.similarCount80,
      totalCompared: otherResumes.length,
      percentileRank: analysis.percentileRank,
      tips: analysis.tips,
      strengths: analysis.strengths,
    });
  } catch (error) {
    console.error("Resume analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze resume" },
      { status: 500 }
    );
  }
}
