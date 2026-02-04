"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FeedProvider } from "@/contexts/feed-context";
import { JobFeed } from "@/components/feed/job-feed";
import { XPProgressBar } from "@/components/xp/xp-progress-bar";
import { LevelUpCelebration } from "@/components/xp/level-up-celebration";
import { FilterBottomSheet } from "@/components/filters/filter-bottom-sheet";
import { FilterChips } from "@/components/filters/filter-chips";

export default function FeedPage() {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <FeedProvider>
      <div className="min-h-screen flex flex-col lg:hidden">
        {/* XP Progress Bar (mobile only) */}
        <XPProgressBar />

        {/* Filter Section */}
        <div className="fixed top-[60px] left-0 right-0 z-40 px-4 py-2 bg-background/80 backdrop-blur-sm border-b border-border/50">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setFilterOpen(true)}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <FilterChips />
          </div>
        </div>

        {/* Main Feed Area */}
        <main className="flex-1 pt-[120px] pb-24 px-4">
          <div className="h-[calc(100vh-200px)]">
            <JobFeed />
          </div>
        </main>

        {/* Filter Bottom Sheet */}
        <FilterBottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} />

        {/* Level Up Celebration Modal */}
        <LevelUpCelebration />
      </div>

      {/* Desktop fallback - redirect to jobs page */}
      <div className="hidden lg:flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Feed is mobile-only</h1>
          <p className="text-muted-foreground mb-4">
            The swipe feed experience is optimized for mobile devices.
          </p>
          <Button asChild>
            <a href="/jobs">Browse Jobs on Desktop</a>
          </Button>
        </div>
      </div>
    </FeedProvider>
  );
}
