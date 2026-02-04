"use client";

import { motion } from "framer-motion";
import { Zap, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeed } from "@/contexts/feed-context";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { XPGainAnimation } from "./xp-gain-animation";
import { QuestProgressPill } from "@/components/quest/quest-progress-pill";

interface XPProgressBarProps {
  className?: string;
}

export function XPProgressBar({ className }: XPProgressBarProps) {
  const { level, xpProgress, xpAnimation, currentXP } = useFeed();

  const xpInLevel = currentXP % 100;
  const xpToNext = 100 - xpInLevel;

  return (
    <motion.div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 lg:hidden",
        "bg-background/95 backdrop-blur-md border-b border-border/50",
        "safe-top",
        className
      )}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Level Badge */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Badge className="gradient-bg text-white border-0 px-3 py-1 text-sm font-bold shadow-lg">
            <Zap className="w-3.5 h-3.5 mr-1" />
            Lvl {level}
          </Badge>
        </motion.div>

        {/* XP Progress */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              {xpInLevel} / 100 XP
            </span>
            <span className="text-muted-foreground">
              {xpToNext} to level {level + 1}
            </span>
          </div>
          <div className="relative">
            <Progress
              value={xpProgress}
              className="h-2.5 bg-primary/10"
            />
            {/* Shimmer effect on progress */}
            <motion.div
              className="absolute inset-0 h-2.5 rounded-full overflow-hidden pointer-events-none"
              initial={false}
            >
              <motion.div
                className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                  x: ["-100%", "400%"],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          </div>
        </div>

        {/* Quest Progress */}
        <QuestProgressPill />

        {/* Streak Indicator (Compact) */}
        <StreakIndicatorCompact />
      </div>

      {/* XP Gain Animation Overlay */}
      {xpAnimation && (
        <XPGainAnimation
          amount={xpAnimation.amount}
          type={xpAnimation.type}
          multiplier={xpAnimation.multiplier}
        />
      )}
    </motion.div>
  );
}

function StreakIndicatorCompact() {
  // This is a simplified version - could be enhanced to fetch real streak data
  return (
    <motion.div
      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-100 dark:bg-orange-900/30"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Flame className="w-4 h-4 text-orange-500" />
    </motion.div>
  );
}
