/**
 * Geocoding backfill script for existing jobs
 *
 * Usage:
 *   npm install -g tsx
 *   tsx scripts/geocode-jobs.ts [--limit 100] [--force]
 *
 * Options:
 *   --limit N    Process only N unique locations (default: 500)
 *   --force      Re-geocode all locations even if already geocoded
 */

import { PrismaClient } from "@prisma/client";
import {
  geocodeLocation,
  isGeocodeSuccess,
  normalizeLocation,
} from "../src/lib/geocoding/geocode";

const prisma = new PrismaClient();

interface LocationStats {
  location: string;
  count: number;
  alreadyGeocoded: number;
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : 500;
  const force = args.includes("--force");

  console.log("🗺️  Geocoding Backfill Script");
  console.log("================================");
  console.log(`Limit: ${limit} locations`);
  console.log(`Force re-geocode: ${force ? "Yes" : "No"}`);
  console.log("");

  // Step 1: Get unique locations with job counts
  console.log("📊 Analyzing location data...");

  const locationGroups = await prisma.jobListing.groupBy({
    by: ["location"],
    where: {
      isActive: true,
      location: { not: null },
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
    take: limit,
  });

  console.log(`Found ${locationGroups.length} unique locations`);
  console.log("");

  // Step 2: Check how many already have coordinates
  const stats: LocationStats[] = [];

  for (const group of locationGroups) {
    if (!group.location) continue;

    const alreadyGeocoded = await prisma.jobListing.count({
      where: {
        location: group.location,
        latitude: { not: null },
        longitude: { not: null },
      },
    });

    stats.push({
      location: group.location,
      count: group._count.id,
      alreadyGeocoded,
    });
  }

  const totalJobs = stats.reduce((sum, s) => sum + s.count, 0);
  const alreadyGeocodedJobs = stats.reduce((sum, s) => sum + s.alreadyGeocoded, 0);
  const needsGeocoding = stats.filter(
    (s) => force || s.alreadyGeocoded === 0
  ).length;

  console.log("📈 Statistics:");
  console.log(`  Total jobs affected: ${totalJobs}`);
  console.log(`  Already geocoded: ${alreadyGeocodedJobs} (${Math.round((alreadyGeocodedJobs / totalJobs) * 100)}%)`);
  console.log(`  Needs geocoding: ${needsGeocoding} locations`);
  console.log("");

  if (needsGeocoding === 0) {
    console.log("✅ All locations already geocoded!");
    return;
  }

  // Step 3: Geocode locations
  console.log("🌍 Starting geocoding...");
  console.log("⏱️  Rate limit: 1 request per second");
  console.log("");

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < stats.length; i++) {
    const stat = stats[i];
    const progress = `[${i + 1}/${stats.length}]`;

    // Skip if already geocoded (unless force mode)
    if (!force && stat.alreadyGeocoded > 0) {
      console.log(`${progress} ⏭️  Skipping "${stat.location}" (${stat.count} jobs) - already geocoded`);
      skippedCount++;
      continue;
    }

    console.log(`${progress} 🔍 Geocoding "${stat.location}" (${stat.count} jobs)...`);

    // Geocode the location
    const result = await geocodeLocation(stat.location);

    if (isGeocodeSuccess(result)) {
      // Update all jobs with this location
      const updated = await prisma.jobListing.updateMany({
        where: {
          location: stat.location,
          isActive: true,
        },
        data: {
          latitude: result.latitude,
          longitude: result.longitude,
          geocodedAt: new Date(),
        },
      });

      console.log(`${progress} ✅ Success! Updated ${updated.count} jobs`);
      console.log(`         📍 Coords: ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`);
      console.log(`         🎯 Confidence: ${(result.confidence * 100).toFixed(0)}%`);
      successCount++;
    } else {
      console.log(`${progress} ❌ Failed: ${result.error}`);
      errorCount++;
    }

    console.log("");
  }

  // Step 4: Summary
  console.log("================================");
  console.log("📊 Final Summary:");
  console.log(`  ✅ Successfully geocoded: ${successCount} locations`);
  console.log(`  ❌ Failed: ${errorCount} locations`);
  console.log(`  ⏭️  Skipped: ${skippedCount} locations`);
  console.log("");

  // Calculate coverage
  const finalGeocoded = await prisma.jobListing.count({
    where: {
      isActive: true,
      latitude: { not: null },
      longitude: { not: null },
    },
  });

  const totalActive = await prisma.jobListing.count({
    where: {
      isActive: true,
    },
  });

  const coverage = (finalGeocoded / totalActive) * 100;

  console.log("🗺️  Database Coverage:");
  console.log(`  Total active jobs: ${totalActive}`);
  console.log(`  Geocoded jobs: ${finalGeocoded}`);
  console.log(`  Coverage: ${coverage.toFixed(1)}%`);
  console.log("");

  if (coverage < 80) {
    console.log("⚠️  Coverage is below 80%. Consider running again with higher limit.");
  } else {
    console.log("🎉 Great job! Coverage is above 80%!");
  }
}

main()
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
