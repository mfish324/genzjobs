"use client";

import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Building2,
  MapPin,
  DollarSign,
  Wifi,
  Clock,
  Briefcase,
  Bookmark,
  BookmarkCheck,
  X,
  Check,
  Zap,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { XP_REWARDS } from "@/lib/constants";

interface JobListing {
  id: string;
  title: string;
  company: string;
  companyLogo: string | null;
  location: string | null;
  jobType: string | null;
  experienceLevel: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  skills: string[];
  remote: boolean;
  applyUrl: string | null;
  postedAt: string;
}

interface SwipeableJobCardProps {
  job: JobListing;
  isSaved?: boolean;
  onSave?: (jobId: string) => void;
  onSkip?: (jobId: string) => void;
  onApply?: (jobId: string) => void;
  enableSwipe?: boolean;
}

export function SwipeableJobCard({
  job,
  isSaved = false,
  onSave,
  onSkip,
  onApply,
  enableSwipe = true,
}: SwipeableJobCardProps) {
  const { data: session } = useSession();
  const [saved, setSaved] = useState(isSaved);
  const [isApplying, setIsApplying] = useState(false);
  const constraintsRef = useRef(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  // Background colors based on swipe direction
  const leftBgOpacity = useTransform(x, [-200, 0], [1, 0]);
  const rightBgOpacity = useTransform(x, [0, 200], [0, 1]);

  const handleDragEnd = async (_: never, info: PanInfo) => {
    const threshold = 100;

    if (info.offset.x < -threshold) {
      // Swiped left - Skip/Not interested
      if (onSkip) {
        onSkip(job.id);
      }
      toast.info("Job skipped");
    } else if (info.offset.x > threshold) {
      // Swiped right - Save/Interested
      if (!saved) {
        await handleSave();
      }
    }
  };

  const handleSave = async () => {
    if (!session) {
      toast.error("Please sign in to save jobs");
      return;
    }

    try {
      const res = await fetch("/api/saved-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobListingId: job.id }),
      });

      if (res.ok) {
        setSaved(true);
        onSave?.(job.id);
        toast.success("Job saved!", {
          description: `+${XP_REWARDS.SAVE_JOB} XP earned`,
        });
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save job");
      }
    } catch {
      toast.error("Failed to save job");
    }
  };

  const handleApply = async () => {
    if (!session) {
      toast.error("Please sign in to apply");
      return;
    }

    setIsApplying(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobListingId: job.id }),
      });

      const data = await res.json();

      if (res.ok) {
        onApply?.(job.id);
        const streakBonus = data.streakMultiplier > 1 ? ` (${data.streakMultiplier}x streak!)` : "";
        toast.success("Application recorded!", {
          description: `+${data.xpEarned} XP earned${streakBonus}`,
        });

        // Open apply URL in new tab
        if (job.applyUrl) {
          window.open(job.applyUrl, "_blank", "noopener,noreferrer");
        }
      } else {
        toast.error(data.error || "Failed to record application");
      }
    } catch {
      toast.error("Failed to record application");
    } finally {
      setIsApplying(false);
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

  const cardContent = (
    <Card className="relative overflow-hidden bg-card hover:shadow-lg transition-shadow">
      <CardContent className="p-4 sm:p-6">
        <div className="flex gap-4">
          {/* Company Logo */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center shrink-0">
            {job.companyLogo ? (
              <img
                src={job.companyLogo}
                alt={job.company}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded object-contain"
              />
            ) : (
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            )}
          </div>

          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base line-clamp-1">
                  {job.title}
                </h3>
                <p className="text-muted-foreground text-sm line-clamp-1">
                  {job.company}
                </p>
              </div>

              {/* Save Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!saved) handleSave();
                }}
                className={cn(
                  "p-2 rounded-full transition-colors shrink-0",
                  saved
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {saved ? (
                  <BookmarkCheck className="w-4 h-4" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Job Meta */}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[100px]">{job.location}</span>
                </span>
              )}
              {job.remote && (
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-[10px] px-1.5 py-0"
                >
                  <Wifi className="w-2.5 h-2.5 mr-0.5" />
                  Remote
                </Badge>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo()}
              </span>
            </div>

            {/* Salary */}
            {formatSalary() && (
              <div className="flex items-center gap-1 mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-3.5 h-3.5" />
                {formatSalary()}
              </div>
            )}

            {/* Skills (show 3 max on mobile) */}
            {job.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {job.skills.slice(0, 3).map((skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 bg-muted/50"
                  >
                    {skill}
                  </Badge>
                ))}
                {job.skills.length > 3 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 bg-muted/50"
                  >
                    +{job.skills.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleApply();
                }}
                disabled={isApplying}
                className="flex-1 gradient-bg text-white text-xs h-8"
              >
                {isApplying ? (
                  "Applying..."
                ) : (
                  <>
                    <Zap className="w-3 h-3 mr-1" />
                    Quick Apply
                    <span className="ml-1 text-[10px] opacity-80">
                      +{XP_REWARDS.JOB_APPLICATION}XP
                    </span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-8 px-3"
              >
                <Link href={`/jobs/${job.id}`}>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!enableSwipe) {
    return cardContent;
  }

  return (
    <div ref={constraintsRef} className="relative">
      {/* Background indicators */}
      <motion.div
        className="absolute inset-0 rounded-xl bg-red-500/20 flex items-center justify-start pl-6"
        style={{ opacity: leftBgOpacity }}
      >
        <X className="w-8 h-8 text-red-500" />
      </motion.div>
      <motion.div
        className="absolute inset-0 rounded-xl bg-green-500/20 flex items-center justify-end pr-6"
        style={{ opacity: rightBgOpacity }}
      >
        <Check className="w-8 h-8 text-green-500" />
      </motion.div>

      {/* Draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        style={{ x, rotate, opacity }}
        whileTap={{ cursor: "grabbing" }}
        className="relative z-10"
      >
        {cardContent}
      </motion.div>
    </div>
  );
}

// Job card stack for Tinder-style swiping
interface JobCardStackProps {
  jobs: JobListing[];
  onSave?: (jobId: string) => void;
  onSkip?: (jobId: string) => void;
  onEmpty?: () => void;
}

export function JobCardStack({
  jobs,
  onSave,
  onSkip,
  onEmpty,
}: JobCardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleAction = (action: "save" | "skip", jobId: string) => {
    if (action === "save") {
      onSave?.(jobId);
    } else {
      onSkip?.(jobId);
    }

    if (currentIndex === jobs.length - 1) {
      onEmpty?.();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  if (currentIndex >= jobs.length) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No more jobs to show</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Check back later for new opportunities!
          </p>
          <Button onClick={onEmpty}>Load More</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative h-[400px]">
      {/* Show next cards in stack */}
      {jobs.slice(currentIndex, currentIndex + 3).map((job, index) => (
        <motion.div
          key={job.id}
          className="absolute inset-0"
          style={{
            zIndex: jobs.length - index,
            scale: 1 - index * 0.05,
            y: index * 10,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 - index * 0.05 }}
        >
          {index === 0 ? (
            <SwipeableJobCard
              job={job}
              onSave={() => handleAction("save", job.id)}
              onSkip={() => handleAction("skip", job.id)}
              enableSwipe={true}
            />
          ) : (
            <SwipeableJobCard job={job} enableSwipe={false} />
          )}
        </motion.div>
      ))}

      {/* Action buttons */}
      <div className="absolute -bottom-16 left-0 right-0 flex justify-center gap-4">
        <Button
          variant="outline"
          size="lg"
          className="rounded-full w-14 h-14 border-red-500/50 hover:bg-red-500/10 hover:border-red-500"
          onClick={() => handleAction("skip", jobs[currentIndex].id)}
        >
          <X className="w-6 h-6 text-red-500" />
        </Button>
        <Button
          size="lg"
          className="rounded-full w-14 h-14 bg-green-500 hover:bg-green-600"
          onClick={() => handleAction("save", jobs[currentIndex].id)}
        >
          <Check className="w-6 h-6 text-white" />
        </Button>
      </div>
    </div>
  );
}
