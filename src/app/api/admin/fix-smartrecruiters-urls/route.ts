import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find SmartRecruiters jobs with API URLs as applyUrl
    const badJobs = await prisma.jobListing.findMany({
      where: {
        source: "smartrecruiters",
        applyUrl: { contains: "api.smartrecruiters.com" },
      },
      select: {
        id: true,
        sourceId: true,
        company: true,
        applyUrl: true,
      },
    });

    const dryRun = req.nextUrl.searchParams.get("dryRun") === "true";

    let fixed = 0;
    const samples: { sourceId: string | null; oldUrl: string | null; newUrl: string | null }[] = [];

    for (const job of badJobs) {
      // Try to extract job ID from the existing API URL
      // Format: https://api.smartrecruiters.com/v1/companies/{Slug}/postings/{jobId}
      const apiMatch = (job.applyUrl || "").match(
        /api\.smartrecruiters\.com\/v1\/companies\/([^/]+)\/postings\/(.+)/
      );

      let newUrl: string | null = null;

      if (apiMatch) {
        const companySlug = apiMatch[1];
        const jobId = apiMatch[2];
        newUrl = `https://jobs.smartrecruiters.com/${companySlug}/${jobId}`;
      } else {
        // Fallback: try sourceId format smartrecruiters_{slug}_{jobId}
        const parts = (job.sourceId || "").split("_");
        if (parts.length >= 3) {
          const slug = parts[1];
          const jobId = parts.slice(2).join("_");
          const companySlug = slug.charAt(0).toUpperCase() + slug.slice(1);
          newUrl = `https://jobs.smartrecruiters.com/${companySlug}/${jobId}`;
        }
      }

      if (samples.length < 5) {
        samples.push({ sourceId: job.sourceId, oldUrl: job.applyUrl, newUrl });
      }

      if (!newUrl) continue;

      if (!dryRun) {
        await prisma.jobListing.update({
          where: { id: job.id },
          data: { applyUrl: newUrl },
        });
      }
      fixed++;
    }

    return NextResponse.json({
      found: badJobs.length,
      fixed,
      dryRun,
      samples,
    });
  } catch (error) {
    console.error("Fix SR URLs error:", error);
    return NextResponse.json(
      { error: "Failed to fix URLs" },
      { status: 500 }
    );
  }
}
