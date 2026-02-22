"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, MapPin, TrendingUp } from "lucide-react";
import { JobDensityMap, MapPoint } from "@/components/map/job-density-map";
import { MapControls } from "@/components/map/map-controls";
import { MapLegend } from "@/components/map/map-legend";
import { Card, CardContent } from "@/components/ui/card";

interface MapData {
  points: MapPoint[];
  total: number;
  metadata: {
    view: string;
    filters: Record<string, unknown>;
    generatedAt: string;
  };
}

function MapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [view, setView] = useState<"us" | "world">(
    (searchParams.get("view") as "us" | "world") || "us"
  );
  const [experienceLevel, setExperienceLevel] = useState(
    searchParams.get("experienceLevel") || "all"
  );
  const [jobType, setJobType] = useState(searchParams.get("jobType") || "all");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [remote, setRemote] = useState(searchParams.get("remote") === "true");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [usOnly, setUsOnly] = useState(searchParams.get("usOnly") !== "false");

  // Debounced values for search/location (used in API calls)
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [debouncedLocation, setDebouncedLocation] = useState(location);

  const [mapData, setMapData] = useState<MapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search and location inputs
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedLocation(location), 400);
    return () => clearTimeout(timer);
  }, [location]);

  // Sync filter state to URL
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const params = new URLSearchParams();
    if (view !== "us") params.set("view", view);
    if (experienceLevel !== "all") params.set("experienceLevel", experienceLevel);
    if (jobType !== "all") params.set("jobType", jobType);
    if (category !== "all") params.set("category", category);
    if (remote) params.set("remote", "true");
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (debouncedLocation) params.set("location", debouncedLocation);
    if (!usOnly) params.set("usOnly", "false");

    const queryString = params.toString();
    router.replace(`/map${queryString ? `?${queryString}` : ""}`, { scroll: false });
  }, [view, experienceLevel, jobType, category, remote, debouncedSearch, debouncedLocation, usOnly, router]);

  // Fetch map data
  const fetchMapData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        view,
      });

      if (experienceLevel !== "all") {
        params.set("experienceLevel", experienceLevel);
      }

      if (jobType !== "all") {
        params.set("jobType", jobType);
      }

      if (category !== "all") {
        params.set("category", category);
      }

      if (remote) {
        params.set("remote", "true");
      }

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      if (debouncedLocation) {
        params.set("location", debouncedLocation);
      }

      params.set("usOnly", usOnly.toString());

      const response = await fetch(`/api/jobs/map-data?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch map data");
      }

      const data = await response.json();
      setMapData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [view, experienceLevel, jobType, category, remote, debouncedSearch, debouncedLocation, usOnly]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Job Market Map</h1>
        </div>
        <p className="text-muted-foreground">
          Explore job opportunities by location and discover the hottest job markets
        </p>
      </div>

      {/* Controls */}
      <MapControls
        view={view}
        onViewChange={setView}
        experienceLevel={experienceLevel}
        onExperienceLevelChange={setExperienceLevel}
        jobType={jobType}
        onJobTypeChange={setJobType}
        category={category}
        onCategoryChange={setCategory}
        remote={remote}
        onRemoteChange={setRemote}
        search={search}
        onSearchChange={setSearch}
        location={location}
        onLocationChange={setLocation}
        usOnly={usOnly}
        onUsOnlyChange={setUsOnly}
      />

      {/* Stats */}
      {mapData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Jobs</p>
                  <p className="text-2xl font-bold text-primary">{mapData.total}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Locations</p>
                  <p className="text-2xl font-bold text-primary">
                    {mapData.points.length}
                  </p>
                </div>
                <MapPin className="w-8 h-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg per Location</p>
                  <p className="text-2xl font-bold text-primary">
                    {mapData.points.length > 0
                      ? Math.round(mapData.total / mapData.points.length)
                      : 0}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Map */}
      <div className="mb-6">
        {isLoading ? (
          <div className="w-full h-[600px] rounded-xl border bg-muted/50 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading map data...</p>
          </div>
        ) : error ? (
          <div className="w-full h-[600px] rounded-xl border bg-destructive/10 flex flex-col items-center justify-center gap-3">
            <p className="text-destructive font-semibold">Error loading map</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : mapData ? (
          <JobDensityMap points={mapData.points} view={view} />
        ) : null}
      </div>

      {/* Legend */}
      <MapLegend />

      {/* Tips */}
      <Card className="mt-4 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2">Tips for Using the Map</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Zoom in and out to explore different regions</li>
            <li>• Click on markers to see detailed job statistics</li>
            <li>• Use filters to narrow down by experience level, job type, or category</li>
            <li>
              • Larger markers indicate more job opportunities in that location
            </li>
            <li>• Color intensity shows job density (red = highest, green = lowest)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[600px]">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      }
    >
      <MapContent />
    </Suspense>
  );
}
