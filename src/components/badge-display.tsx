"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Lock, Star, Sparkles, Trophy, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BadgeData {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  criteria: string;
  threshold: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  xpBonus: number;
  earned: boolean;
  currentProgress: number;
  progress: number;
  earnedAt: string | null;
}

interface BadgesResponse {
  earned: BadgeData[];
  available: BadgeData[];
  totalEarned: number;
  totalAvailable: number;
}

const rarityColors = {
  common: "from-gray-400 to-gray-500",
  rare: "from-blue-400 to-blue-600",
  epic: "from-purple-400 to-purple-600",
  legendary: "from-amber-400 to-orange-500",
};

const rarityBorders = {
  common: "border-gray-400",
  rare: "border-blue-500",
  epic: "border-purple-500",
  legendary: "border-amber-500",
};

const rarityGlow = {
  common: "",
  rare: "shadow-blue-500/25",
  epic: "shadow-purple-500/25",
  legendary: "shadow-amber-500/50 animate-pulse",
};

function BadgeIcon({ icon, className }: { icon: string; className?: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    "rocket": <Zap className={className} />,
    "fire": <Sparkles className={className} />,
    "star": <Star className={className} />,
    "trophy": <Trophy className={className} />,
    "target": <Target className={className} />,
    "award": <Award className={className} />,
  };

  return iconMap[icon] || <Award className={className} />;
}

function BadgeCard({ badge, showProgress = true }: { badge: BadgeData; showProgress?: boolean }) {
  const isEarned = badge.earned;

  return (
    <motion.div
      className={cn(
        "relative p-4 rounded-xl border-2 transition-all",
        isEarned
          ? cn(rarityBorders[badge.rarity], "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900", rarityGlow[badge.rarity], "shadow-lg")
          : "border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 opacity-60"
      )}
      whileHover={{ scale: isEarned ? 1.02 : 1 }}
    >
      {/* Rarity indicator */}
      <div className="absolute top-2 right-2">
        <BadgeUI
          variant="outline"
          className={cn(
            "text-xs capitalize",
            isEarned ? `bg-gradient-to-r ${rarityColors[badge.rarity]} text-white border-0` : ""
          )}
        >
          {badge.rarity}
        </BadgeUI>
      </div>

      <div className="flex flex-col items-center text-center space-y-2">
        {/* Badge Icon */}
        <div
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center",
            isEarned
              ? `bg-gradient-to-br ${rarityColors[badge.rarity]} shadow-lg`
              : "bg-gray-200 dark:bg-gray-800"
          )}
        >
          {isEarned ? (
            <span className="text-3xl">{badge.icon}</span>
          ) : (
            <Lock className="w-6 h-6 text-gray-400" />
          )}
        </div>

        {/* Badge Name */}
        <h3 className={cn("font-bold text-sm", !isEarned && "text-gray-500")}>
          {badge.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2">
          {badge.description}
        </p>

        {/* Progress or Earned Date */}
        {showProgress && (
          <div className="w-full mt-2">
            {isEarned ? (
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                Earned {badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString() : ""}
              </p>
            ) : (
              <div className="space-y-1">
                <Progress value={badge.progress * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {badge.currentProgress} / {badge.threshold}
                </p>
              </div>
            )}
          </div>
        )}

        {/* XP Bonus */}
        <div className="flex items-center gap-1 text-xs text-primary font-medium">
          <Sparkles className="w-3 h-3" />
          +{badge.xpBonus} XP
        </div>
      </div>
    </motion.div>
  );
}

export function BadgeDisplayCompact({ limit = 3 }: { limit?: number }) {
  const [badges, setBadges] = useState<BadgesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBadges() {
      try {
        const res = await fetch("/api/badges");
        if (res.ok) {
          const data = await res.json();
          setBadges(data);
        }
      } catch (error) {
        console.error("Failed to fetch badges:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBadges();
  }, []);

  if (isLoading) {
    return (
      <div className="flex gap-1">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!badges || badges.totalEarned === 0) {
    return null;
  }

  const displayBadges = badges.earned.slice(0, limit);
  const remaining = badges.totalEarned - limit;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1 hover:opacity-80 transition-opacity">
          <TooltipProvider>
            <div className="flex -space-x-2">
              {displayBadges.map((badge) => (
                <Tooltip key={badge.id}>
                  <TooltipTrigger asChild>
                    <motion.div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900",
                        `bg-gradient-to-br ${rarityColors[badge.rarity]}`
                      )}
                      whileHover={{ scale: 1.1, zIndex: 10 }}
                    >
                      <span className="text-sm">{badge.icon}</span>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">{badge.name}</p>
                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {remaining > 0 && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted border-2 border-white dark:border-gray-900 text-xs font-medium">
                  +{remaining}
                </div>
              )}
            </div>
          </TooltipProvider>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            My Badges ({badges.totalEarned}/{badges.totalAvailable})
          </DialogTitle>
        </DialogHeader>
        <BadgeGrid badges={badges} />
      </DialogContent>
    </Dialog>
  );
}

export function BadgeGrid({ badges }: { badges: BadgesResponse }) {
  return (
    <div className="space-y-6">
      {/* Earned Badges */}
      {badges.earned.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-green-500" />
            Earned ({badges.earned.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {badges.earned.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      )}

      {/* Available Badges */}
      {badges.available.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-400" />
            Available ({badges.available.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {badges.available.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function BadgeDisplay() {
  const [badges, setBadges] = useState<BadgesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBadges() {
      try {
        const res = await fetch("/api/badges");
        if (res.ok) {
          const data = await res.json();
          setBadges(data);
        }
      } catch (error) {
        console.error("Failed to fetch badges:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBadges();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!badges) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load badges
      </div>
    );
  }

  return <BadgeGrid badges={badges} />;
}
