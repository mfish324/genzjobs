"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bookmark,
  BookmarkX,
  Building2,
  MapPin,
  Clock,
  DollarSign,
  ExternalLink,
  Loader2,
  Briefcase,
  Wifi,
  Zap,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { XP_REWARDS } from "@/lib/constants";

interface SavedJob {
  id: string;
  savedAt: string;
  notes: string | null;
  jobListing: {
    id: string;
    title: string;
    company: string;
    companyLogo: string | null;
    location: string | null;
    jobType: string | null;
    experienceLevel: string | null;
    category: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string | null;
    salaryPeriod: string | null;
    skills: string[];
    remote: boolean;
    country: string | null;
    applyUrl: string | null;
    postedAt: string;
    isActive: boolean;
  };
}

export default function SavedJobsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  useEffect(() => {
    async function fetchSavedJobs() {
      try {
        const res = await fetch("/api/saved-jobs");
        if (res.ok) {
          const data = await res.json();
          setSavedJobs(data);
        }
      } catch {
        toast.error("Failed to load saved jobs");
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user) {
      fetchSavedJobs();
    }
  }, [session]);

  const handleRemove = async (jobListingId: string) => {
    try {
      const res = await fetch(`/api/saved-jobs?jobListingId=${jobListingId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSavedJobs(savedJobs.filter((sj) => sj.jobListing.id !== jobListingId));
        toast.success("Job removed from saved");
      }
    } catch {
      toast.error("Failed to remove job");
    }
  };

  const formatSalary = (job: SavedJob["jobListing"]) => {
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

  const timeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const activeJobs = savedJobs.filter((sj) => sj.jobListing.isActive);
  const expiredJobs = savedJobs.filter((sj) => !sj.jobListing.isActive);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Bookmark className="w-8 h-8 text-violet-500" />
          Saved Jobs
        </h1>
        <p className="text-muted-foreground">
          Jobs you&apos;ve saved for later. Apply when you&apos;re ready!
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-violet-600">{savedJobs.length}</p>
            <p className="text-sm text-muted-foreground">Total Saved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{activeJobs.length}</p>
            <p className="text-sm text-muted-foreground">Active Listings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-400">{expiredJobs.length}</p>
            <p className="text-sm text-muted-foreground">Expired</p>
          </CardContent>
        </Card>
      </div>

      {/* Saved Jobs List */}
      {savedJobs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bookmark className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No saved jobs yet</h3>
            <p className="text-muted-foreground mb-4">
              Save jobs you&apos;re interested in to apply later
            </p>
            <Button asChild>
              <Link href="/jobs">Browse Jobs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Active Jobs */}
          {activeJobs.length > 0 && (
            <>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Active Listings ({activeJobs.length})
              </h2>
              {activeJobs.map((saved) => (
                <JobCard
                  key={saved.id}
                  saved={saved}
                  onRemove={handleRemove}
                  formatSalary={formatSalary}
                  timeAgo={timeAgo}
                />
              ))}
            </>
          )}

          {/* Expired Jobs */}
          {expiredJobs.length > 0 && (
            <>
              <h2 className="text-lg font-semibold flex items-center gap-2 mt-8">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                Expired Listings ({expiredJobs.length})
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                These jobs are no longer available, but you can still view them.
              </p>
              {expiredJobs.map((saved) => (
                <JobCard
                  key={saved.id}
                  saved={saved}
                  onRemove={handleRemove}
                  formatSalary={formatSalary}
                  timeAgo={timeAgo}
                  isExpired
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function JobCard({
  saved,
  onRemove,
  formatSalary,
  timeAgo,
  isExpired = false,
}: {
  saved: SavedJob;
  onRemove: (id: string) => void;
  formatSalary: (job: SavedJob["jobListing"]) => string | null;
  timeAgo: (date: string) => string;
  isExpired?: boolean;
}) {
  const job = saved.jobListing;

  return (
    <Card className={`hover:border-violet-300 transition-colors ${isExpired ? "opacity-60" : ""}`}>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          {/* Company Logo */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center shrink-0">
            {job.companyLogo ? (
              <img
                src={job.companyLogo}
                alt={job.company}
                className="w-10 h-10 rounded object-contain"
              />
            ) : (
              <Building2 className="w-6 h-6 text-violet-500" />
            )}
          </div>

          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="text-lg font-semibold hover:text-violet-600 transition-colors line-clamp-1"
                  >
                    {job.title}
                  </Link>
                  {isExpired && (
                    <Badge variant="secondary" className="text-xs">
                      Expired
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{job.company}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {job.remote && (
                  <Badge className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-xs">
                    <Wifi className="w-3 h-3 mr-1" />
                    Remote
                  </Badge>
                )}
                {!isExpired && (
                  <Badge className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0 text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    +{XP_REWARDS.JOB_APPLICATION} XP
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                </span>
              )}
              {formatSalary(job) && (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <DollarSign className="w-4 h-4" />
                  {formatSalary(job)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Bookmark className="w-4 h-4" />
                Saved {timeAgo(saved.savedAt)}
              </span>
            </div>

            {/* Skills */}
            {job.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {job.skills.slice(0, 4).map((skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  >
                    {skill}
                  </Badge>
                ))}
                {job.skills.length > 4 && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  >
                    +{job.skills.length - 4}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {!isExpired && job.applyUrl && (
              <Button size="sm" asChild>
                <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                  Apply Now
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/jobs/${job.id}`}>View</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(job.id)}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
