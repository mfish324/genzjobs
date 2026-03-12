import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rewriteJobForGenZ } from "@/lib/ai";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const job = await prisma.jobListing.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        company: true,
        description: true,
        requirements: true,
        benefits: true,
        skills: true,
        jobType: true,
        experienceLevel: true,
        genzDescription: true,
        genzDescriptionAt: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Return cached version if it exists
    if (job.genzDescription) {
      return NextResponse.json({
        summary: job.genzDescription,
        cached: true,
      });
    }

    // Generate new rewrite
    const result = await rewriteJobForGenZ(
      job.title,
      job.company,
      job.description,
      job.requirements,
      job.benefits,
      job.skills,
      job.jobType,
      job.experienceLevel
    );

    if (!result) {
      return NextResponse.json(
        { error: "AI rewrite unavailable", hasApiKey: !!process.env.ANTHROPIC_API_KEY },
        { status: 503 }
      );
    }

    // Combine sections into a single cached string
    let fullSummary = result.summary;
    if (result.requirements) {
      fullSummary += "\n\n" + result.requirements;
    }
    if (result.benefits) {
      fullSummary += "\n\n" + result.benefits;
    }

    // Cache to database
    await prisma.jobListing.update({
      where: { id },
      data: {
        genzDescription: fullSummary,
        genzDescriptionAt: new Date(),
      },
    });

    return NextResponse.json({
      summary: fullSummary,
      cached: false,
    });
  } catch (error) {
    console.error("Gen-Z description error:", error);
    return NextResponse.json(
      { error: "Failed to generate description" },
      { status: 500 }
    );
  }
}
