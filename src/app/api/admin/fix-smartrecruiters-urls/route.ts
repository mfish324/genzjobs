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

    let fixed = 0;
    for (const job of badJobs) {
      // sourceId format: smartrecruiters_{slug}_{jobId}
      // Extract the job ID (last segment after the slug)
      const parts = (job.sourceId || "").split("_");
      // parts: ["smartrecruiters", slug, jobId]
      if (parts.length < 3) continue;

      const slug = parts[1];
      const jobId = parts.slice(2).join("_"); // in case jobId has underscores
      const companySlug = slug.charAt(0).toUpperCase() + slug.slice(1);

      const newUrl = `https://jobs.smartrecruiters.com/${companySlug}/${jobId}`;

      await prisma.jobListing.update({
        where: { id: job.id },
        data: { applyUrl: newUrl },
      });
      fixed++;
    }

    return NextResponse.json({
      found: badJobs.length,
      fixed,
    });
  } catch (error) {
    console.error("Fix SR URLs error:", error);
    return NextResponse.json(
      { error: "Failed to fix URLs" },
      { status: 500 }
    );
  }
}
