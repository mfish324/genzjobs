"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { XP_REWARDS, calculateLevel, levelProgress } from "@/lib/constants";

// Types
export interface JobListing {
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
  isTrending?: boolean;
}

export interface FilterState {
  jobType: string;
  experienceLevel: string;
  category: string;
  remote: boolean;
  location: string;
}

export interface XPAnimation {
  id: string;
  amount: number;
  type: "save" | "interest" | "quest";
  multiplier: number;
}

interface FeedContextType {
  // Jobs
  jobs: JobListing[];
  currentIndex: number;
  isLoading: boolean;
  hasMore: boolean;

  // XP State
  currentXP: number;
  level: number;
  xpProgress: number;
  xpAnimation: XPAnimation | null;
  showLevelUp: boolean;

  // Filters
  filters: FilterState;

  // Excluded job IDs (saved, skipped, interested)
  excludedIds: Set<string>;

  // Actions
  loadJobs: () => Promise<void>;
  advanceCard: () => void;
  saveJob: (jobId: string) => Promise<{ success: boolean; xpEarned?: number }>;
  skipJob: (jobId: string) => Promise<void>;
  expressInterest: (jobId: string) => Promise<{ success: boolean; xpEarned?: number; multiplier?: number }>;
  setFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;
  triggerXPAnimation: (amount: number, type: XPAnimation["type"], multiplier?: number) => void;
  dismissLevelUp: () => void;
  refreshFeed: () => Promise<void>;
}

const defaultFilters: FilterState = {
  jobType: "",
  experienceLevel: "",
  category: "",
  remote: false,
  location: "",
};

const FeedContext = createContext<FeedContextType | null>(null);

export function FeedProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();

  // Job state
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // XP state
  const [currentXP, setCurrentXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [xpAnimation, setXpAnimation] = useState<XPAnimation | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [previousLevel, setPreviousLevel] = useState(1);

  // Filters
  const [filters, setFiltersState] = useState<FilterState>(defaultFilters);

  // Excluded IDs (jobs user has already interacted with)
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  // Fetch user's XP on mount
  useEffect(() => {
    if (session?.user) {
      fetchUserXP();
      fetchExcludedJobs();
    }
  }, [session]);

  const fetchUserXP = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setCurrentXP(data.xp || 0);
        setLevel(data.level || 1);
        setPreviousLevel(data.level || 1);
      }
    } catch (error) {
      console.error("Failed to fetch user XP:", error);
    }
  };

  const fetchExcludedJobs = async () => {
    try {
      // Fetch saved, skipped, and applied job IDs
      const [savedRes, skippedRes, applicationsRes] = await Promise.all([
        fetch("/api/saved-jobs"),
        fetch("/api/skipped-jobs"),
        fetch("/api/applications"),
      ]);

      const excluded = new Set<string>();

      if (savedRes.ok) {
        const saved = await savedRes.json();
        saved.forEach((item: { jobListingId: string }) => excluded.add(item.jobListingId));
      }

      if (skippedRes.ok) {
        const skipped = await skippedRes.json();
        skipped.forEach((item: { jobListingId: string }) => excluded.add(item.jobListingId));
      }

      if (applicationsRes.ok) {
        const applications = await applicationsRes.json();
        applications.forEach((item: { jobListingId: string }) => excluded.add(item.jobListingId));
      }

      setExcludedIds(excluded);
    } catch (error) {
      console.error("Failed to fetch excluded jobs:", error);
    }
  };

  const loadJobs = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        usOnly: "true",
      });

      if (filters.jobType) params.set("jobType", filters.jobType);
      if (filters.experienceLevel) params.set("experienceLevel", filters.experienceLevel);
      if (filters.category) params.set("category", filters.category);
      if (filters.remote) params.set("remote", "true");
      if (filters.location) params.set("location", filters.location);

      const res = await fetch(`/api/jobs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch jobs");

      const data = await res.json();

      // Filter out excluded jobs
      const newJobs = data.jobs.filter(
        (job: JobListing) => !excludedIds.has(job.id)
      );

      // Also fetch trending status
      const trendingRes = await fetch("/api/jobs/trending");
      const trendingIds = trendingRes.ok
        ? new Set((await trendingRes.json()).trendingIds || [])
        : new Set();

      const jobsWithTrending = newJobs.map((job: JobListing) => ({
        ...job,
        isTrending: trendingIds.has(job.id),
      }));

      setJobs((prev) => [...prev, ...jobsWithTrending]);
      setPage((prev) => prev + 1);
      setHasMore(data.pagination.page < data.pagination.pages);
    } catch (error) {
      console.error("Failed to load jobs:", error);
      toast.error("Failed to load jobs");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, page, filters, excludedIds]);

  const advanceCard = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);

    // Preload more jobs when running low
    if (jobs.length - currentIndex < 5 && hasMore && !isLoading) {
      loadJobs();
    }
  }, [jobs.length, currentIndex, hasMore, isLoading, loadJobs]);

  const saveJob = useCallback(async (jobId: string): Promise<{ success: boolean; xpEarned?: number }> => {
    if (!session) {
      toast.error("Please sign in to save jobs");
      return { success: false };
    }

    try {
      const res = await fetch("/api/saved-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobListingId: jobId }),
      });

      if (res.ok) {
        const xpEarned = XP_REWARDS.SAVE_JOB;

        // Update local XP state
        const newXP = currentXP + xpEarned;
        const newLevel = calculateLevel(newXP);

        setCurrentXP(newXP);

        if (newLevel > level) {
          setLevel(newLevel);
          setShowLevelUp(true);
        }

        // Add to excluded
        setExcludedIds((prev) => new Set([...prev, jobId]));

        return { success: true, xpEarned };
      } else {
        const data = await res.json();
        if (data.error !== "Job already saved") {
          toast.error(data.error || "Failed to save job");
        }
        return { success: false };
      }
    } catch {
      toast.error("Failed to save job");
      return { success: false };
    }
  }, [session, currentXP, level]);

  const skipJob = useCallback(async (jobId: string) => {
    if (!session) return;

    try {
      await fetch("/api/skipped-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobListingId: jobId }),
      });

      // Add to excluded regardless of response
      setExcludedIds((prev) => new Set([...prev, jobId]));
    } catch {
      // Silently fail for skips
    }
  }, [session]);

  const expressInterest = useCallback(async (jobId: string): Promise<{ success: boolean; xpEarned?: number; multiplier?: number }> => {
    if (!session) {
      toast.error("Please sign in to express interest");
      return { success: false };
    }

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobListingId: jobId,
          status: "interested", // Mark as interest, not full application
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const xpEarned = data.xpEarned;
        const multiplier = data.streakMultiplier || 1;

        // Update local XP state
        const newXP = currentXP + xpEarned;
        const newLevel = calculateLevel(newXP);

        setCurrentXP(newXP);

        if (newLevel > level) {
          setLevel(newLevel);
          setShowLevelUp(true);
        }

        // Add to excluded
        setExcludedIds((prev) => new Set([...prev, jobId]));

        return { success: true, xpEarned, multiplier };
      } else {
        if (data.error !== "Already applied to this job") {
          toast.error(data.error || "Failed to express interest");
        }
        return { success: false };
      }
    } catch {
      toast.error("Failed to express interest");
      return { success: false };
    }
  }, [session, currentXP, level]);

  const setFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    // Reset feed when filters change
    setJobs([]);
    setCurrentIndex(0);
    setPage(1);
    setHasMore(true);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    setJobs([]);
    setCurrentIndex(0);
    setPage(1);
    setHasMore(true);
  }, []);

  const triggerXPAnimation = useCallback((amount: number, type: XPAnimation["type"], multiplier = 1) => {
    const id = Math.random().toString(36).substr(2, 9);
    setXpAnimation({ id, amount, type, multiplier });

    // Clear animation after delay
    setTimeout(() => {
      setXpAnimation(null);
    }, 1500);
  }, []);

  const dismissLevelUp = useCallback(() => {
    setShowLevelUp(false);
    setPreviousLevel(level);
  }, [level]);

  const refreshFeed = useCallback(async () => {
    setJobs([]);
    setCurrentIndex(0);
    setPage(1);
    setHasMore(true);
    await fetchExcludedJobs();
  }, []);

  // Load initial jobs
  useEffect(() => {
    if (jobs.length === 0 && !isLoading) {
      loadJobs();
    }
  }, [jobs.length, isLoading, loadJobs]);

  const xpProgress = levelProgress(currentXP);

  return (
    <FeedContext.Provider
      value={{
        jobs,
        currentIndex,
        isLoading,
        hasMore,
        currentXP,
        level,
        xpProgress,
        xpAnimation,
        showLevelUp,
        filters,
        excludedIds,
        loadJobs,
        advanceCard,
        saveJob,
        skipJob,
        expressInterest,
        setFilters,
        clearFilters,
        triggerXPAnimation,
        dismissLevelUp,
        refreshFeed,
      }}
    >
      {children}
    </FeedContext.Provider>
  );
}

export function useFeed() {
  const context = useContext(FeedContext);
  if (!context) {
    throw new Error("useFeed must be used within a FeedProvider");
  }
  return context;
}
