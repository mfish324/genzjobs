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
  Flag,
  Zap,
  ExternalLink,
  TrendingUp,
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
import { EXPERIENCE_LEVELS, JOB_TYPES, JOB_CATEGORIES, XP_REWARDS } from "@/lib/constants";

interface Job {
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
  postedAt: string;
  applyUrl: string | null;
  publisher: string | null;
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
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [remote, setRemote] = useState(searchParams.get("remote") === "true");
  const [usOnly, setUsOnly] = useState(searchParams.get("usOnly") !== "false"); // Default to true
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (location) params.set("location", location);
      if (jobType && jobType !== "all") params.set("jobType", jobType);
      if (experienceLevel && experienceLevel !== "all") params.set("experienceLevel", experienceLevel);
      if (category && category !== "all") params.set("category", category);
      if (remote) params.set("remote", "true");
      if (usOnly) params.set("usOnly", "true");
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
  }, [search, location, jobType, experienceLevel, category, remote, usOnly, page]);

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
    setCategory("all");
    setRemote(false);
    setUsOnly(true);
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Find Your Next Adventure</h1>
        <p className="text-muted-foreground">
          Discover jobs that match your skills and earn {XP_REWARDS.JOB_APPLICATION} XP for each
          application!
        </p>
      </div>

      {/* Category Tabs */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={category === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => { setCategory("all"); setPage(1); }}
            className={category === "all" ? "bg-violet-500 hover:bg-violet-600" : ""}
          >
            All Jobs
          </Button>
          {JOB_CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              variant={category === cat.value ? "default" : "outline"}
              size="sm"
              onClick={() => { setCategory(cat.value); setPage(1); }}
              className={category === cat.value ? "bg-violet-500 hover:bg-violet-600" : ""}
            >
              <span className="mr-1.5">{cat.icon}</span>
              {cat.label}
            </Button>
          ))}
        </div>
        {category !== "all" && (
          <p className="text-sm text-muted-foreground mt-2">
            {JOB_CATEGORIES.find(c => c.value === category)?.description}
          </p>
        )}
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
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="us-only-mobile"
                    checked={usOnly}
                    onChange={(e) => setUsOnly(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="us-only-mobile">US jobs only</label>
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

          <Button
            variant={usOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setUsOnly(!usOnly)}
            className={usOnly ? "bg-blue-500 hover:bg-blue-600" : ""}
          >
            <Flag className="w-4 h-4 mr-2" />
            US Only
          </Button>

          {(search || location || jobType !== "all" || experienceLevel !== "all" || category !== "all" || remote || !usOnly) && (
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job, index) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <Card className="group h-full hover:shadow-lg hover:border-violet-300 transition-all duration-300 cursor-pointer overflow-hidden relative">
                {/* Gradient accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                <CardContent className="p-5">
                  {/* Header with logo and XP badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {job.companyLogo ? (
                        <img
                          src={job.companyLogo}
                          alt={job.company}
                          className="w-8 h-8 rounded object-contain"
                        />
                      ) : (
                        <Building2 className="w-5 h-5 text-violet-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {job.remote && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                          <Wifi className="w-3 h-3 mr-1" />
                          Remote
                        </Badge>
                      )}
                      <Badge className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0 text-xs">
                        <Zap className="w-3 h-3 mr-1" />
                        +{XP_REWARDS.JOB_APPLICATION} XP
                      </Badge>
                    </div>
                  </div>

                  {/* Title and company */}
                  <h3 className="font-semibold text-lg mb-1 line-clamp-2 group-hover:text-violet-600 transition-colors">
                    {job.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-3">{job.company}</p>

                  {/* Key details */}
                  <div className="space-y-2 mb-4">
                    {job.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 text-violet-400" />
                        <span className="truncate">{job.location}</span>
                      </div>
                    )}
                    {formatSalary(job) && (
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                        <DollarSign className="w-4 h-4" />
                        <span>{formatSalary(job)}</span>
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  {job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {job.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs bg-slate-50">
                          {skill}
                        </Badge>
                      ))}
                      {job.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs bg-slate-50">
                          +{job.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Footer with metadata */}
                  <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(job.postedAt)}
                      </span>
                      {job.category && job.category !== "tech" && (
                        <span className="flex items-center gap-1">
                          {JOB_CATEGORIES.find(c => c.value === job.category)?.icon}
                        </span>
                      )}
                    </div>
                    {job.publisher && (
                      <span className="text-xs opacity-60">via {job.publisher}</span>
                    )}
                  </div>

                  {/* Hover action hint */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-violet-500/10 to-transparent h-16 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                    <span className="text-xs text-violet-600 font-medium flex items-center gap-1">
                      View Details <ExternalLink className="w-3 h-3" />
                    </span>
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
