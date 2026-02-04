"use client";

import { useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import Link from "next/link";
import {
  Building2,
  MapPin,
  DollarSign,
  Wifi,
  Clock,
  Briefcase,
  X,
  Check,
  ArrowUp,
  Zap,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { XP_REWARDS } from "@/lib/constants";
import type { JobListing } from "@/contexts/feed-context";

interface FullScreenJobCardProps {
  job: JobListing;
  isTop: boolean;
  stackIndex: number;
  onSave: () => void;
  onSkip: () => void;
  onInterest: () => void;
}

export function FullScreenJobCard({
  job,
  isTop,
  stackIndex,
  onSave,
  onSkip,
  onInterest,
}: FullScreenJobCardProps) {
  const constraintsRef = useRef(null);

  // Motion values for drag
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Rotation based on horizontal movement
  const rotate = useTransform(x, [-200, 200], [-15, 15]);

  // Opacity during drag
  const cardOpacity = useTransform(
    [x, y],
    ([latestX, latestY]: number[]) => {
      const absX = Math.abs(latestX);
      const absY = Math.abs(latestY);
      const maxOffset = Math.max(absX, absY);
      return maxOffset > 150 ? 0.8 : 1;
    }
  );

  // Overlay opacities for swipe direction feedback
  const leftOverlayOpacity = useTransform(x, [-150, -50, 0], [1, 0.5, 0]);
  const rightOverlayOpacity = useTransform(x, [0, 50, 150], [0, 0.5, 1]);
  const upOverlayOpacity = useTransform(y, [-150, -50, 0], [1, 0.5, 0]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;

    // Swipe UP to express interest (most deliberate - higher threshold)
    if (offset.y < -150 || (offset.y < -100 && velocity.y < -500)) {
      onInterest();
      return;
    }

    // Swipe RIGHT to save
    if (offset.x > 100 || (offset.x > 50 && velocity.x > 500)) {
      onSave();
      return;
    }

    // Swipe LEFT to skip
    if (offset.x < -100 || (offset.x < -50 && velocity.x < -500)) {
      onSkip();
      return;
    }
  };

  const formatSalary = () => {
    if (!job.salaryMin && !job.salaryMax) return null;
    const currency = job.salaryCurrency || "USD";
    const period = job.salaryPeriod || "yearly";
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });

    if (job.salaryMin && job.salaryMax) {
      return `${formatter.format(job.salaryMin)} - ${formatter.format(job.salaryMax)}/${period === "yearly" ? "yr" : "hr"}`;
    }
    if (job.salaryMin) {
      return `${formatter.format(job.salaryMin)}+/${period === "yearly" ? "yr" : "hr"}`;
    }
    return `Up to ${formatter.format(job.salaryMax!)}/${period === "yearly" ? "yr" : "hr"}`;
  };

  const timeAgo = () => {
    const date = new Date(job.postedAt);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
    return `${Math.floor(diffInDays / 30)}mo ago`;
  };

  const jobTypeBadgeColor = () => {
    switch (job.jobType) {
      case "full-time":
        return "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400";
      case "part-time":
        return "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400";
      case "contract":
        return "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400";
      case "internship":
        return "bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-400";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";
    }
  };

  // Card positioning for stack effect
  const stackStyles = {
    scale: 1 - stackIndex * 0.05,
    y: stackIndex * 8,
    zIndex: 10 - stackIndex,
  };

  const cardContent = (
    <Card className="h-full bg-card border-0 shadow-xl rounded-3xl overflow-hidden">
      <CardContent className="h-full p-0 flex flex-col">
        {/* Top Section - Company & Job Info */}
        <div className="flex-1 p-6 flex flex-col">
          {/* Trending Badge */}
          {job.isTrending && (
            <motion.div
              className="self-start mb-4"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 px-3 py-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                Trending
              </Badge>
            </motion.div>
          )}

          {/* Company Logo & Name */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center shrink-0 shadow-sm">
              {job.companyLogo ? (
                <img
                  src={job.companyLogo}
                  alt={job.company}
                  className="w-12 h-12 rounded-xl object-contain"
                />
              ) : (
                <Building2 className="w-8 h-8 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-sm font-medium">
                {job.company}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {job.remote && (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs px-2"
                  >
                    <Wifi className="w-3 h-3 mr-1" />
                    Remote
                  </Badge>
                )}
                {job.jobType && (
                  <Badge variant="secondary" className={cn("text-xs px-2", jobTypeBadgeColor())}>
                    <Briefcase className="w-3 h-3 mr-1" />
                    {job.jobType.charAt(0).toUpperCase() + job.jobType.slice(1).replace("-", " ")}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Job Title */}
          <h2 className="text-2xl font-bold leading-tight mb-4">
            {job.title}
          </h2>

          {/* Location & Posted */}
          <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm mb-6">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {job.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {timeAgo()}
            </span>
          </div>

          {/* Salary */}
          {formatSalary() && (
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold">
                <DollarSign className="w-4 h-4" />
                {formatSalary()}
              </div>
            </div>
          )}

          {/* Skills */}
          {job.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {job.skills.slice(0, 6).map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="text-sm px-3 py-1 bg-muted/50 border-muted-foreground/20"
                >
                  {skill}
                </Badge>
              ))}
              {job.skills.length > 6 && (
                <Badge
                  variant="outline"
                  className="text-sm px-3 py-1 bg-muted/50 border-muted-foreground/20"
                >
                  +{job.skills.length - 6} more
                </Badge>
              )}
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* View Details Link */}
          <Link href={`/jobs/${job.id}`} className="block">
            <Button
              variant="ghost"
              className="w-full justify-between text-muted-foreground hover:text-foreground"
            >
              View full details
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Bottom Section - XP Info */}
        <div className="p-6 pt-0">
          <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30">
            <Zap className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
              Swipe up to earn +{XP_REWARDS.JOB_APPLICATION} XP
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Non-interactive cards in stack (not top)
  if (!isTop) {
    return (
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={stackStyles}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.7, ...stackStyles }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {cardContent}
      </motion.div>
    );
  }

  // Interactive top card with swipe
  return (
    <div ref={constraintsRef} className="absolute inset-0">
      {/* Skip overlay (left swipe) */}
      <motion.div
        className="absolute inset-0 rounded-3xl bg-red-500/20 flex items-center justify-center pointer-events-none z-20"
        style={{ opacity: leftOverlayOpacity }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full bg-red-500/30 flex items-center justify-center">
            <X className="w-10 h-10 text-red-500" />
          </div>
          <span className="font-bold text-red-500 text-lg">Skip</span>
        </div>
      </motion.div>

      {/* Save overlay (right swipe) */}
      <motion.div
        className="absolute inset-0 rounded-3xl bg-green-500/20 flex items-center justify-center pointer-events-none z-20"
        style={{ opacity: rightOverlayOpacity }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full bg-green-500/30 flex items-center justify-center">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <span className="font-bold text-green-500 text-lg">Save +{XP_REWARDS.SAVE_JOB} XP</span>
        </div>
      </motion.div>

      {/* Interest overlay (up swipe) */}
      <motion.div
        className="absolute inset-0 rounded-3xl bg-gradient-to-t from-violet-500/30 to-purple-500/30 flex items-center justify-center pointer-events-none z-20"
        style={{ opacity: upOverlayOpacity }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full bg-violet-500/30 flex items-center justify-center">
            <ArrowUp className="w-10 h-10 text-violet-500 animate-bounce" />
          </div>
          <span className="font-bold text-violet-500 text-lg">Interested +{XP_REWARDS.JOB_APPLICATION} XP</span>
        </div>
      </motion.div>

      {/* Draggable card */}
      <motion.div
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        style={{ x, y, rotate, opacity: cardOpacity }}
        whileTap={{ cursor: "grabbing" }}
        className="absolute inset-0 z-10"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{
          x: x.get() > 50 ? 300 : x.get() < -50 ? -300 : 0,
          y: y.get() < -50 ? -500 : 0,
          opacity: 0,
          transition: { duration: 0.3 },
        }}
      >
        {cardContent}
      </motion.div>
    </div>
  );
}
