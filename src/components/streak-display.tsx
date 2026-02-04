"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Zap, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  multiplier: number;
  multiplierDisplay: string;
  streakEmoji: string;
  streakMessage: string;
  checkedInToday: boolean;
  nextMilestone: number | null;
  daysToNextMilestone: number | null;
}

export function StreakDisplay({ compact = false }: { compact?: boolean }) {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    async function fetchStreak() {
      try {
        const res = await fetch("/api/streaks");
        if (res.ok) {
          const data = await res.json();
          setStreak(data);
        }
      } catch (error) {
        console.error("Failed to fetch streak:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStreak();
  }, []);

  const handleCheckIn = async () => {
    try {
      const res = await fetch("/api/streaks", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setStreak(data);
        if (data.streakIncremented) {
          setShowAnimation(true);
          setTimeout(() => setShowAnimation(false), 2000);
        }
      }
    } catch (error) {
      console.error("Failed to check in:", error);
    }
  };

  if (isLoading || !streak) {
    return (
      <div className={cn("animate-pulse rounded-lg bg-muted", compact ? "w-12 h-6" : "w-24 h-8")} />
    );
  }

  const flameColor =
    streak.currentStreak >= 7
      ? "text-orange-500"
      : streak.currentStreak >= 3
      ? "text-amber-500"
      : "text-gray-400";

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={!streak.checkedInToday ? handleCheckIn : undefined}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium transition-all",
                streak.checkedInToday
                  ? "bg-orange-100 dark:bg-orange-900/30"
                  : "bg-muted hover:bg-orange-100 dark:hover:bg-orange-900/30 cursor-pointer"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <AnimatePresence>
                {showAnimation && (
                  <motion.div
                    className="absolute -top-2 -right-2"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                  >
                    <span className="text-lg">+1</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <Flame className={cn("w-4 h-4", flameColor)} />
              <span className={cn(flameColor, "font-bold")}>{streak.currentStreak}</span>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold">{streak.streakEmoji} {streak.streakMessage}</p>
              <p className="text-xs text-muted-foreground">
                Current: {streak.currentStreak} days | Best: {streak.longestStreak} days
              </p>
              <p className="text-xs font-medium text-primary">
                XP Multiplier: {streak.multiplierDisplay}
              </p>
              {streak.nextMilestone && (
                <p className="text-xs text-muted-foreground">
                  {streak.daysToNextMilestone} days to {streak.nextMilestone}-day streak!
                </p>
              )}
              {!streak.checkedInToday && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Click to check in today!
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <motion.div
      className="relative flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 border border-orange-200 dark:border-orange-800"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <AnimatePresence>
        {showAnimation && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-orange-400/20"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <motion.div
          animate={streak.currentStreak > 0 ? { scale: [1, 1.2, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Flame className={cn("w-6 h-6", flameColor)} />
        </motion.div>
        <div className="text-center">
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
            {streak.currentStreak}
          </p>
          <p className="text-xs text-muted-foreground">day streak</p>
        </div>
      </div>

      <div className="h-8 w-px bg-orange-200 dark:bg-orange-800" />

      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <div>
          <p className="text-sm font-bold text-primary">{streak.multiplierDisplay}</p>
          <p className="text-xs text-muted-foreground">XP bonus</p>
        </div>
      </div>

      {streak.longestStreak > 0 && (
        <>
          <div className="h-8 w-px bg-orange-200 dark:bg-orange-800" />
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {streak.longestStreak}
              </p>
              <p className="text-xs text-muted-foreground">best</p>
            </div>
          </div>
        </>
      )}

      {!streak.checkedInToday && (
        <motion.button
          onClick={handleCheckIn}
          className="ml-2 px-3 py-1 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Check In
        </motion.button>
      )}
    </motion.div>
  );
}
