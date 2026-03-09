"use client";

import { motion } from "framer-motion";
import { Sparkles, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  levelProgress,
  xpToNextLevel,
  calculateLevel,
  getLevelTitle,
  getMotivationalText,
  LEVEL_THRESHOLDS,
} from "@/lib/constants";

interface XpProgressHeroProps {
  xp: number;
  level: number;
}

export function XpProgressHero({ xp, level }: XpProgressHeroProps) {
  const progress = levelProgress(xp);
  const remaining = xpToNextLevel(xp);
  const actualLevel = calculateLevel(xp);
  const title = getLevelTitle(actualLevel);
  const motivational = getMotivationalText(xp);
  const isMaxLevel = actualLevel >= LEVEL_THRESHOLDS.length;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 p-6 text-white shadow-xl">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">Level {actualLevel}</h2>
                <Badge className="bg-white/20 text-white hover:bg-white/30 text-xs">
                  {title}
                </Badge>
              </div>
              <p className="text-white/80 text-sm">{motivational}</p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="flex items-center gap-1 text-2xl font-bold">
              <Sparkles className="w-5 h-5" />
              {xp.toLocaleString()}
            </div>
            <p className="text-white/70 text-sm">Total XP</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/80">
              {isMaxLevel ? "Max Level Reached!" : `${remaining.toLocaleString()} XP to Level ${actualLevel + 1}`}
            </span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-white/90 to-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
