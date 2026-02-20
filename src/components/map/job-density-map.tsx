"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamically import the entire Leaflet component (client-side only)
const LeafletMap = dynamic(
  () => import("./leaflet-map").then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    ),
  }
);

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
      <LeafletMap
        points={points}
        center={config.center}
        zoom={config.zoom}
        onPointClick={onPointClick}
      />
    </div>
  );
}
