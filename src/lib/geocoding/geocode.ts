/**
 * Geocoding utilities for converting location strings to coordinates
 * Uses Nominatim (OpenStreetMap) API for geocoding
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
  confidence: number; // 0-1 scale
}

export interface GeocodeError {
  error: string;
  location: string;
}

// Rate limiting: Nominatim requires max 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

/**
 * Sleep helper for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normalize location string for better geocoding results
 */
export function normalizeLocation(location: string): string {
  if (!location) return "";

  return (
    location
      .trim()
      // Expand common abbreviations
      .replace(/\bSF\b/gi, "San Francisco")
      .replace(/\bNYC\b/gi, "New York City")
      .replace(/\bLA\b/gi, "Los Angeles")
      .replace(/\bDC\b/gi, "Washington DC")
      // Remove extra whitespace
      .replace(/\s+/g, " ")
  );
}

/**
 * Geocode a location string using Nominatim API
 * Respects rate limiting (1 request per second)
 */
export async function geocodeLocation(
  location: string
): Promise<GeocodeResult | GeocodeError> {
  const normalized = normalizeLocation(location);

  if (!normalized) {
    return { error: "Empty location", location };
  }

  // Rate limiting: ensure at least 1 second between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }
  lastRequestTime = Date.now();

  try {
    // Nominatim API endpoint
    const params = new URLSearchParams({
      q: normalized,
      format: "json",
      limit: "1",
      addressdetails: "1",
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          "User-Agent": "GenzJobs/1.0 (job-board-map-feature)",
        },
      }
    );

    if (!response.ok) {
      return {
        error: `HTTP ${response.status}: ${response.statusText}`,
        location,
      };
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return { error: "No results found", location };
    }

    const result = data[0];

    // Calculate confidence based on importance score (0-1 scale)
    // Nominatim returns importance as 0-1, where higher is better
    const confidence = parseFloat(result.importance) || 0.5;

    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
      confidence,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      location,
    };
  }
}

/**
 * Batch geocode multiple locations with deduplication
 * Returns a map of location -> GeocodeResult
 */
export async function batchGeocode(
  locations: string[]
): Promise<Map<string, GeocodeResult | GeocodeError>> {
  const results = new Map<string, GeocodeResult | GeocodeError>();

  // Deduplicate locations (case-insensitive)
  const uniqueLocations = Array.from(
    new Set(locations.map((loc) => normalizeLocation(loc)))
  ).filter(Boolean);

  console.log(
    `Geocoding ${uniqueLocations.length} unique locations (from ${locations.length} total)...`
  );

  for (const location of uniqueLocations) {
    const result = await geocodeLocation(location);
    results.set(location, result);

    // Log progress
    if (results.size % 10 === 0) {
      console.log(`Geocoded ${results.size}/${uniqueLocations.length}...`);
    }
  }

  return results;
}

/**
 * Check if a geocode result is successful
 */
export function isGeocodeSuccess(
  result: GeocodeResult | GeocodeError
): result is GeocodeResult {
  return "latitude" in result && "longitude" in result;
}
