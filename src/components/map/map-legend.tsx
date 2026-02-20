"use client";

import { Card, CardContent } from "@/components/ui/card";

export function MapLegend() {
  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <h3 className="font-semibold text-sm mb-3">Job Density Legend</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <span className="text-sm text-muted-foreground">1-10 jobs</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500" />
            <span className="text-sm text-muted-foreground">11-50 jobs</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500" />
            <span className="text-sm text-muted-foreground">51-100 jobs</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500" />
            <span className="text-sm text-muted-foreground">100+ jobs</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Click on any marker to see job details and top companies in that location.
        </p>
      </CardContent>
    </Card>
  );
}
