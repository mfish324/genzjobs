"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  MapPin,
  Briefcase,
  Filter,
  Loader2,
  Building2,
  Clock,
  DollarSign,
  Star,
  Wifi,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EXPERIENCE_LEVELS, JOB_TYPES, XP_REWARDS } from "@/lib/constants";

interface Job {
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
  postedAt: string;
  applyUrl: string | null;
  difficultyLevel: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

function JobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [jobType, setJobType] = useState(searchParams.get("jobType") || "all");
  const [experienceLevel, setExperienceLevel] = useState(
    searchParams.get("experienceLevel") || "all"
  );
  const [remote, setRemote] = useState(searchParams.get("remote") === "true");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (location) params.set("location", location);
      if (jobType && jobType !== "all") params.set("jobType", jobType);
      if (experienceLevel && experienceLevel !== "all") params.set("experienceLevel", experienceLevel);
      if (remote) params.set("remote", "true");
      params.set("page", page.toString());

      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();

      if (data.error) {
        console.error("API error:", data.error);
        setJobs([]);
        setPagination(null);
      } else {
        setJobs(data.jobs || []);
        setPagination(data.pagination || null);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
      setJobs([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [search, location, jobType, experienceLevel, remote, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSearch = () => {
    setPage(1);
    fetchJobs();
  };

  const clearFilters = () => {
    setSearch("");
    setLocation("");
    setJobType("all");
    setExperienceLevel("all");
    setRemote(false);
    setPage(1);
  };

  const formatSalary = (job: Job) => {
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Find Your Next Adventure</h1>
        <p className="text-muted-foreground">
          Discover jobs that match your skills and earn {XP_REWARDS.JOB_APPLICATION} XP for each
          application!
        </p>
      </div>

      {/* Search & Filters */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search jobs, companies, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <div className="relative flex-1 md:max-w-xs">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} className="bg-violet-500 hover:bg-violet-600">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>

          {/* Mobile Filters */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="md:hidden">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Job Type</label>
                  <Select value={jobType} onValueChange={setJobType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {JOB_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Experience</label>
                  <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="All levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All levels</SelectItem>
                      {EXPERIENCE_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remote-mobile"
                    checked={remote}
                    onChange={(e) => setRemote(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="remote-mobile">Remote only</label>
                </div>
                <Button onClick={clearFilters} variant="outline" className="w-full">
                  Clear Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Filters */}
        <div className="hidden md:flex gap-4 items-center">
          <Select value={jobType} onValueChange={setJobType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Job Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {JOB_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={experienceLevel} onValueChange={setExperienceLevel}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Experience Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              {EXPERIENCE_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={remote ? "default" : "outline"}
            size="sm"
            onClick={() => setRemote(!remote)}
            className={remote ? "bg-violet-500 hover:bg-violet-600" : ""}
          >
            <Wifi className="w-4 h-4 mr-2" />
            Remote
          </Button>

          {(search || location || jobType !== "all" || experienceLevel !== "all" || remote) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Results count */}
      {pagination && (
        <p className="text-sm text-muted-foreground mb-4">
          Showing {jobs.length} of {pagination.total} jobs
        </p>
      )}

      {/* Job listings */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20">
          <Briefcase className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search or filters
          </p>
          <Button onClick={clearFilters} variant="outline">
            Clear all filters
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <Card className="hover:border-violet-300 hover:shadow-md transition-all cursor-pointer">
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
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold hover:text-violet-600 line-clamp-1">
                            {job.title}
                          </h3>
                          <p className="text-muted-foreground">{job.company}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className="shrink-0 bg-violet-50 text-violet-600 border-violet-200"
                        >
                          <Star className="w-3 h-3 mr-1" />+{XP_REWARDS.JOB_APPLICATION} XP
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {job.location}
                          </span>
                        )}
                        {job.jobType && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {JOB_TYPES.find((t) => t.value === job.jobType)?.label || job.jobType}
                          </span>
                        )}
                        {formatSalary(job) && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {formatSalary(job)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {timeAgo(job.postedAt)}
                        </span>
                        {job.remote && (
                          <Badge variant="secondary" className="text-xs">
                            <Wifi className="w-3 h-3 mr-1" />
                            Remote
                          </Badge>
                        )}
                      </div>

                      {job.skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {job.skills.slice(0, 5).map((skill) => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {job.skills.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{job.skills.length - 5} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            disabled={page === pagination.pages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      </div>
    }>
      <JobsContent />
    </Suspense>
  );
}
