/**
 * Vercel Cron Endpoint for Geocoding Jobs
 *
 * Runs every 6 hours to geocode jobs that have a location string but no coordinates.
 * Uses a two-pass approach:
 * 1. Copy pass: Copy coordinates from already-geocoded jobs with the same location
 * 2. Geocode pass: Call Nominatim API for truly new locations (1 req/sec rate limit)
 *
 * Protected by CRON_SECRET header.
 *
 * Schedule configured in vercel.json:
 * - path: /api/cron/geocode
 * - schedule: "0 0,6,12,18 * * *" (every 6 hours)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { geocodeLocation, isGeocodeSuccess } from '@/lib/geocoding/geocode';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const TIME_BUDGET_MS = 50_000; // 50 seconds, leaving 10s margin

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 500 }
    );
  }

  const expectedAuth = `Bearer ${cronSecret}`;
  if (authHeader !== expectedAuth) {
    console.warn('Unauthorized cron request');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    console.log('Starting geocode cron...');

    // Find all unique locations that have at least one un-geocoded active job
    const ungeocodedLocations = await prisma.jobListing.groupBy({
      by: ['location'],
      where: {
        isActive: true,
        location: { not: null },
        latitude: null,
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    if (ungeocodedLocations.length === 0) {
      console.log('No un-geocoded jobs found');
      return NextResponse.json({
        success: true,
        copied: 0,
        geocoded: 0,
        failed: 0,
        remaining: 0,
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      });
    }

    const ungeocodedLocationStrings = ungeocodedLocations
      .map((g) => g.location)
      .filter((loc): loc is string => loc != null);

    console.log(`Found ${ungeocodedLocationStrings.length} locations with un-geocoded jobs`);

    let copied = 0;
    let geocoded = 0;
    let failed = 0;
    const locationsToGeocode: { location: string; count: number }[] = [];

    // --- Pass 1: Copy coordinates from already-geocoded jobs ---
    // Single query: get one geocoded job per location that we need
    console.log('Pass 1: Copying coordinates from existing geocoded jobs...');

    const knownCoords = await prisma.jobListing.findMany({
      where: {
        location: { in: ungeocodedLocationStrings },
        latitude: { not: null },
        longitude: { not: null },
      },
      select: { location: true, latitude: true, longitude: true },
      distinct: ['location'],
    });

    // Build a lookup map: location -> { latitude, longitude }
    const coordsByLocation = new Map<string, { latitude: number; longitude: number }>();
    for (const job of knownCoords) {
      if (job.location && job.latitude != null && job.longitude != null) {
        coordsByLocation.set(job.location, {
          latitude: job.latitude,
          longitude: job.longitude,
        });
      }
    }

    console.log(`  Found existing coords for ${coordsByLocation.size} locations`);

    // Bulk update: for each known location, copy coords to un-geocoded jobs
    for (const [location, coords] of coordsByLocation) {
      const result = await prisma.jobListing.updateMany({
        where: {
          location,
          isActive: true,
          latitude: null,
        },
        data: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          geocodedAt: new Date(),
        },
      });

      copied += result.count;
    }

    // Identify locations that still need geocoding (no known coords)
    for (const group of ungeocodedLocations) {
      if (!group.location) continue;
      if (!coordsByLocation.has(group.location)) {
        locationsToGeocode.push({ location: group.location, count: group._count.id });
      }
    }

    console.log(`Pass 1 complete: ${copied} jobs updated by copying (${coordsByLocation.size} locations)`);

    // --- Pass 2: Geocode new locations via Nominatim ---
    console.log(`Pass 2: Geocoding ${locationsToGeocode.length} new locations...`);

    let remaining = locationsToGeocode.length;

    for (const { location, count } of locationsToGeocode) {
      // Check time budget before each API call
      if (Date.now() - startTime > TIME_BUDGET_MS) {
        console.log(`Time budget exhausted, ${remaining} locations remaining`);
        break;
      }

      const result = await geocodeLocation(location);

      if (isGeocodeSuccess(result)) {
        const updated = await prisma.jobListing.updateMany({
          where: {
            location: location,
            isActive: true,
            latitude: null,
          },
          data: {
            latitude: result.latitude,
            longitude: result.longitude,
            geocodedAt: new Date(),
          },
        });

        geocoded += updated.count;
        remaining--;
        console.log(`  Geocoded "${location}" -> ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)} (${updated.count} jobs)`);
      } else {
        failed++;
        remaining--;
        console.log(`  Failed to geocode "${location}": ${result.error}`);
      }
    }

    const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
    console.log(`Geocode cron complete: copied=${copied}, geocoded=${geocoded}, failed=${failed}, remaining=${remaining}`);

    return NextResponse.json({
      success: true,
      copied,
      geocoded,
      failed,
      remaining,
      duration,
    });
  } catch (error) {
    const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error('Geocode cron failed:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration,
      },
      { status: 500 }
    );
  }
}
