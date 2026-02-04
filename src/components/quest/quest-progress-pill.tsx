"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Target, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ActiveQuest {
  id: string;
  title: string;
  progress: number;
  targetCount: number;
  xpReward: number;
  type: "daily" | "weekly" | "milestone";
}

export function QuestProgressPill() {
  const [quest, setQuest] = useState<ActiveQuest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchActiveQuest() {
      try {
        const res = await fetch("/api/quests/active");
        if (res.ok) {
          const data = await res.json();
          if (data.quest) {
            setQuest(data.quest);
          }
        }
      } catch (error) {
        console.error("Failed to fetch active quest:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchActiveQuest();
  }, []);

  if (isLoading) {
    return (
      <div className="w-16 h-6 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!quest) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/quests">
              <motion.div
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Target className="w-3.5 h-3.5 text-muted-foreground" />
              </motion.div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">No active quests. Tap to view quests.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const progressPercent = Math.min((quest.progress / quest.targetCount) * 100, 100);
  const isComplete = quest.progress >= quest.targetCount;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/quests">
            <motion.div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer",
                isComplete
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-violet-100 dark:bg-violet-900/30"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isComplete ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              ) : (
                <Target className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              )}
              <span
                className={cn(
                  "text-xs font-semibold",
                  isComplete
                    ? "text-green-700 dark:text-green-300"
                    : "text-violet-700 dark:text-violet-300"
                )}
              >
                {quest.progress}/{quest.targetCount}
              </span>

              {/* Mini progress bar */}
              {!isComplete && (
                <div className="w-8 h-1.5 rounded-full bg-violet-200 dark:bg-violet-800 overflow-hidden">
                  <motion.div
                    className="h-full bg-violet-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                </div>
              )}
            </motion.div>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold text-sm">{quest.title}</p>
            <p className="text-xs text-muted-foreground">
              {quest.progress} of {quest.targetCount} completed
            </p>
            <p className="text-xs font-medium text-primary">
              Reward: +{quest.xpReward} XP
            </p>
            {isComplete && (
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                Quest complete! Tap to claim.
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
