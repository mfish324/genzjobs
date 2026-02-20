"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamically import Leaflet components (client-side only)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});

import "leaflet/dist/leaflet.css";

export interface MapPoint {
  lat: number;
  lng: number;
  count: number;
  location: string;
  topCompanies: string[];
  avgSalaryMin: number | null;
  avgSalaryMax: number | null;
}

interface JobDensityMapProps {
  points: MapPoint[];
  view: "us" | "world";
  onPointClick?: (point: MapPoint) => void;
}

// Map center and zoom for different views
const MAP_CONFIGS = {
  us: {
    center: [39.8283, -98.5795] as [number, number], // Center of USA
    zoom: 4,
  },
  world: {
    center: [20, 0] as [number, number], // Center of world
    zoom: 2,
  },
};

/**
 * Get marker color based on job count
 */
function getMarkerColor(count: number): string {
  if (count >= 100) return "#ef4444"; // red-500
  if (count >= 50) return "#f97316"; // orange-500
  if (count >= 10) return "#eab308"; // yellow-500
  return "#22c55e"; // green-500
}

/**
 * Get marker radius based on job count (logarithmic scale)
 */
function getMarkerRadius(count: number): number {
  const baseRadius = 8;
  const scale = Math.log10(count + 1);
  return Math.min(baseRadius + scale * 5, 30);
}

/**
 * Format salary range for display
 */
function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return "N/A";
  if (!max) return `$${(min! / 1000).toFixed(0)}k+`;
  if (!min) return `Up to $${(max / 1000).toFixed(0)}k`;
  return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
}

export function JobDensityMap({ points, view, onPointClick }: JobDensityMapProps) {
  const [isClient, setIsClient] = useState(false);
  const config = MAP_CONFIGS[view];

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="w-full h-[600px] rounded-xl border bg-muted/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] rounded-xl overflow-hidden border shadow-lg">
      <MapContainer
        center={config.center}
        zoom={config.zoom}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="dark:opacity-80 dark:invert dark:hue-rotate-180"
        />

        {points.map((point, index) => (
          <CircleMarker
            key={`${point.lat}-${point.lng}-${index}`}
            center={[point.lat, point.lng]}
            radius={getMarkerRadius(point.count)}
            fillColor={getMarkerColor(point.count)}
            color="#fff"
            weight={2}
            opacity={0.8}
            fillOpacity={0.6}
            eventHandlers={{
              click: () => onPointClick?.(point),
            }}
          >
            <Popup>
              <div className="p-2 min-w-[250px]">
                <h3 className="font-bold text-lg mb-2">{point.location}</h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Jobs:</span>
                    <span className="font-semibold text-primary">{point.count}</span>
                  </div>

                  {point.topCompanies.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground block mb-1">
                        Top Companies:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {point.topCompanies.map((company, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                          >
                            {company}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Avg Salary:</span>
                    <span className="font-medium">
                      {formatSalary(point.avgSalaryMin, point.avgSalaryMax)}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      // Navigate to jobs page with location filter
                      window.location.href = `/jobs?location=${encodeURIComponent(
                        point.location
                      )}`;
                    }}
                    className="w-full mt-2 px-3 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    View Jobs
                  </button>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
