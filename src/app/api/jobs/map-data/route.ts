import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ExperienceLevel } from "@prisma/client";

export const dynamic = "force-dynamic";

interface MapPoint {
  lat: number;
  lng: number;
  count: number;
  location: string;
  topCompanies: string[];
  avgSalaryMin: number | null;
  avgSalaryMax: number | null;
}

interface MapDataResponse {
  points: MapPoint[];
  total: number;
  metadata: {
    view: string;
    filters: Record<string, unknown>;
    generatedAt: string;
  };
}

/**
 * GET /api/jobs/map-data
 * Returns aggregated job data for map visualization
 *
 * Query params:
 * - view: "us" | "world" (default: "us")
 * - experienceLevel: ExperienceLevel enum
 * - jobType: string
 * - category: string
 * - remote: boolean
 * - search: text search across title, company, description
 * - location: contains filter on location field
 * - usOnly: explicit boolean override for US-only filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const view = searchParams.get("view") || "us";
    const experienceLevelParam = searchParams.get("experienceLevel");
    const jobType = searchParams.get("jobType");
    const category = searchParams.get("category");
    const remote = searchParams.get("remote") === "true";
    const search = searchParams.get("search") || "";
    const location = searchParams.get("location") || "";
    const usOnlyParam = searchParams.get("usOnly");

    // Build where clause for filtering
    const where: any = {
      isActive: true,
      latitude: { not: null },
      longitude: { not: null },
    };

    if (experienceLevelParam && experienceLevelParam !== "all") {
      // Convert lowercase to uppercase for enum (e.g., "entry" -> "ENTRY")
      where.experienceLevel = experienceLevelParam.toUpperCase() as ExperienceLevel;
    }

    if (jobType && jobType !== "all") {
      where.jobType = jobType;
    }

    if (category && category !== "all") {
      where.category = category;
    }

    if (remote) {
      where.remote = true;
    }

    // Text search across title, company, description
    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { company: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        },
      ];
    }

    // Location contains filter
    if (location) {
      where.location = { contains: location, mode: "insensitive" };
    }

    // US-only filtering: explicit param overrides view-based default
    if (usOnlyParam !== null) {
      if (usOnlyParam === "true") {
        where.country = "US";
      }
    } else if (view === "us") {
      where.country = "US";
    }

    // Whether search/location filters are active (for threshold adjustment)
    const hasTextFilters = !!(search || location);

    // Fetch jobs with coordinates
    const jobs = await prisma.jobListing.findMany({
      where,
      select: {
        latitude: true,
        longitude: true,
        location: true,
        company: true,
        salaryMin: true,
        salaryMax: true,
      },
    });

    // Determine precision based on view
    // US view: 2 decimal places (~1.1km precision, city-level)
    // World view: 0 decimal places (~111km precision, country-level)
    const precision = view === "us" ? 2 : 0;

    // Aggregate jobs by rounded coordinates
    const locationMap = new Map<
      string,
      {
        lat: number;
        lng: number;
        count: number;
        locations: string[];
        companies: string[];
        salariesMin: number[];
        salariesMax: number[];
      }
    >();

    for (const job of jobs) {
      if (job.latitude === null || job.longitude === null) continue;

      // Round coordinates for clustering
      const roundedLat = parseFloat(job.latitude.toFixed(precision));
      const roundedLng = parseFloat(job.longitude.toFixed(precision));
      const key = `${roundedLat},${roundedLng}`;

      if (!locationMap.has(key)) {
        locationMap.set(key, {
          lat: roundedLat,
          lng: roundedLng,
          count: 0,
          locations: [],
          companies: [],
          salariesMin: [],
          salariesMax: [],
        });
      }

      const entry = locationMap.get(key)!;
      entry.count++;

      if (job.location) {
        entry.locations.push(job.location);
      }

      entry.companies.push(job.company);

      if (job.salaryMin) {
        entry.salariesMin.push(job.salaryMin);
      }

      if (job.salaryMax) {
        entry.salariesMax.push(job.salaryMax);
      }
    }

    // Convert to MapPoint array with aggregated data
    const points: MapPoint[] = Array.from(locationMap.values())
      .map((entry) => {
        // Get most common location name
        const locationCounts = new Map<string, number>();
        entry.locations.forEach((loc) => {
          locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);
        });
        const mostCommonLocation =
          Array.from(locationCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
          "Unknown";

        // Get top 3 companies by frequency
        const companyCounts = new Map<string, number>();
        entry.companies.forEach((company) => {
          companyCounts.set(company, (companyCounts.get(company) || 0) + 1);
        });
        const topCompanies = Array.from(companyCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map((c) => c[0]);

        // Calculate average salaries
        const avgSalaryMin =
          entry.salariesMin.length > 0
            ? Math.round(
                entry.salariesMin.reduce((a, b) => a + b, 0) /
                  entry.salariesMin.length
              )
            : null;

        const avgSalaryMax =
          entry.salariesMax.length > 0
            ? Math.round(
                entry.salariesMax.reduce((a, b) => a + b, 0) /
                  entry.salariesMax.length
              )
            : null;

        return {
          lat: entry.lat,
          lng: entry.lng,
          count: entry.count,
          location: mostCommonLocation,
          topCompanies,
          avgSalaryMin,
          avgSalaryMax,
        };
      })
      // Filter out sparse locations (lower threshold when search/location filters active)
      .filter((point) => point.count >= (hasTextFilters ? 1 : 5))
      // Sort by count descending
      .sort((a, b) => b.count - a.count);

    const response: MapDataResponse = {
      points,
      total: jobs.length,
      metadata: {
        view,
        filters: {
          experienceLevel: experienceLevelParam,
          jobType,
          category,
          remote,
          search: search || null,
          location: location || null,
          usOnly: usOnlyParam,
        },
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, {
      headers: {
        // Cache for 1 hour
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error fetching map data:", error);
    return NextResponse.json(
      { error: "Failed to fetch map data" },
      { status: 500 }
    );
  }
}
