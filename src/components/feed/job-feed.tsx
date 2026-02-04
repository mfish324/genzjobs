"use client";

import { useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useFeed } from "@/contexts/feed-context";
import { FullScreenJobCard } from "./full-screen-job-card";

export function JobFeed() {
  const {
    jobs,
    currentIndex,
    isLoading,
    hasMore,
    advanceCard,
    saveJob,
    skipJob,
    expressInterest,
    triggerXPAnimation,
    refreshFeed,
    loadJobs,
  } = useFeed();

  const currentJobs = jobs.slice(currentIndex, currentIndex + 3);
  const isEmpty = currentIndex >= jobs.length && !isLoading;

  const handleSave = useCallback(async (jobId: string) => {
    const result = await saveJob(jobId);
    if (result.success && result.xpEarned) {
      triggerXPAnimation(result.xpEarned, "save");
      toast.success("Job saved!", {
        description: `+${result.xpEarned} XP earned`,
      });
    }
    advanceCard();
  }, [saveJob, triggerXPAnimation, advanceCard]);

  const handleSkip = useCallback(async (jobId: string) => {
    await skipJob(jobId);
    advanceCard();
  }, [skipJob, advanceCard]);

  const handleInterest = useCallback(async (jobId: string) => {
    const result = await expressInterest(jobId);
    if (result.success && result.xpEarned) {
      const multiplierText = result.multiplier && result.multiplier > 1
        ? ` (${result.multiplier}x streak!)`
        : "";
      triggerXPAnimation(result.xpEarned, "interest", result.multiplier);
      toast.success("Interest recorded!", {
        description: `+${result.xpEarned} XP earned${multiplierText}`,
      });
    }
    advanceCard();
  }, [expressInterest, triggerXPAnimation, advanceCard]);

  // Loading state
  if (isLoading && jobs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-10 h-10 text-primary" />
        </motion.div>
        <p className="text-muted-foreground text-center">
          Finding jobs for you...
        </p>
      </div>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 px-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 rounded-full bg-muted flex items-center justify-center"
        >
          <Briefcase className="w-12 h-12 text-muted-foreground" />
        </motion.div>
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">No more jobs</h3>
          <p className="text-muted-foreground text-sm max-w-[250px]">
            You&apos;ve seen all available jobs. Check back later or adjust your filters!
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-[200px]">
          <Button
            onClick={refreshFeed}
            className="w-full gradient-bg"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh Feed
          </Button>
          {hasMore && (
            <Button
              variant="outline"
              onClick={loadJobs}
              disabled={isLoading}
            >
              Load More
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Card Stack */}
      <AnimatePresence mode="popLayout">
        {currentJobs.map((job, index) => (
          <FullScreenJobCard
            key={job.id}
            job={job}
            isTop={index === 0}
            stackIndex={index}
            onSave={() => handleSave(job.id)}
            onSkip={() => handleSkip(job.id)}
            onInterest={() => handleInterest(job.id)}
          />
        ))}
      </AnimatePresence>

      {/* Loading indicator when fetching more */}
      {isLoading && jobs.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm shadow-lg">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading more...</span>
          </div>
        </div>
      )}

      {/* Swipe Instructions (shown briefly) */}
      <SwipeInstructions />
    </div>
  );
}

function SwipeInstructions() {
  // Only show for first-time users - could use localStorage
  return (
    <motion.div
      className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 pointer-events-none z-0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 0.6, y: 0 }}
      transition={{ delay: 1 }}
    >
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>← Skip</span>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>↑ Interested</span>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>Save →</span>
      </div>
    </motion.div>
  );
}
