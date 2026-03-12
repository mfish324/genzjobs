import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

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

    if (!anthropic) {
      return NextResponse.json(
        { error: "AI not configured" },
        { status: 503 }
      );
    }

    // Generate rewrite directly in this route for better error visibility
    const descTrimmed = job.description.substring(0, 2000);
    const reqTrimmed = job.requirements ? job.requirements.substring(0, 800) : "";
    const benTrimmed = job.benefits ? job.benefits.substring(0, 800) : "";

    const prompt = `Rewrite this job listing for Gen-Z (18-28). Use bullet points, emojis, plain language. Be concise and real.

${job.title} at ${job.company} (${job.jobType || "N/A"}, ${job.experienceLevel || "N/A"})
Skills: ${job.skills.slice(0, 10).join(", ") || "N/A"}

DESCRIPTION:
${descTrimmed}
${reqTrimmed ? `\nREQUIREMENTS:\n${reqTrimmed}` : ""}
${benTrimmed ? `\nBENEFITS:\n${benTrimmed}` : ""}

Use emoji section headers. Return ONLY a JSON object:
{"summary":"<full rewritten listing with all sections combined>"}`;

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response type" },
        { status: 500 }
      );
    }

    // Extract summary from response
    let text = content.text;
    // Remove markdown code fences if present
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      text = fenceMatch[1];
    }

    let fullSummary: string;
    try {
      // Fix control characters in JSON string values (newlines, tabs)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const cleaned = jsonMatch[0]
          .replace(/[\x00-\x1F\x7F]/g, (ch) => {
            if (ch === '\n') return '\\n';
            if (ch === '\r') return '\\r';
            if (ch === '\t') return '\\t';
            return '';
          });
        const parsed = JSON.parse(cleaned);
        fullSummary = parsed.summary || content.text;
      } else {
        fullSummary = content.text;
      }
    } catch {
      // If JSON parsing still fails, extract content between first { and last }
      // and use the raw text with some cleanup
      fullSummary = content.text
        .replace(/^```(?:json)?\s*/m, '')
        .replace(/```\s*$/m, '')
        .replace(/^\s*\{\s*"summary"\s*:\s*"/m, '')
        .replace(/"\s*\}\s*$/m, '')
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"');
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate description", detail: message },
      { status: 500 }
    );
  }
}
