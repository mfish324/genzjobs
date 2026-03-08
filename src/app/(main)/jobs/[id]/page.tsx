"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  ExternalLink,
  Star,
  Loader2,
  CheckCircle2,
  Wifi,
  Users,
  TrendingUp,
  BookOpen,
  Sparkles,
  ChevronRight,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { JOB_TYPES, EXPERIENCE_LEVELS, XP_REWARDS } from "@/lib/constants";

interface JobDetails {
  id: string;
  title: string;
  company: string;
  companyLogo: string | null;
  companyWebsite: string | null;
  location: string | null;
  jobType: string | null;
  experienceLevel: string | null;
  description: string;
  requirements: string | null;
  benefits: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  skills: string[];
  remote: boolean;
  postedAt: string;
  applyUrl: string | null;
  difficultyLevel: number;
  hasApplied: boolean;
  applicationsCount: number;
}

interface SimilarJob {
  id: string;
  title: string;
  company: string;
  companyLogo: string | null;
  location: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  skills: string[];
  postedAt: string;
  similarityScore: number;
  matchReasons: string[];
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [similarJobs, setSimilarJobs] = useState<SimilarJob[]>([]);
  const [totalSimilar, setTotalSimilar] = useState(0);
  const [similarLoading, setSimilarLoading] = useState(true);

  useEffect(() => {
    async function fetchJob() {
      try {
        const res = await fetch(`/api/jobs/${id}`);
        if (res.ok) {
          const data = await res.json();
          setJob(data);
        } else {
          toast.error("Job not found");
          router.push("/jobs");
        }
      } catch {
        toast.error("Failed to load job details");
      } finally {
        setIsLoading(false);
      }
    }

    fetchJob();
  }, [id, router]);

  // Fetch similar jobs
  useEffect(() => {
    async function fetchSimilarJobs() {
      setSimilarLoading(true);
      try {
        const res = await fetch(`/api/jobs/${id}/similar?limit=4`);
        if (res.ok) {
          const data = await res.json();
          setSimilarJobs(data.similarJobs || []);
          setTotalSimilar(data.totalSimilar || 0);
        }
      } catch (error) {
        console.error("Failed to load similar jobs:", error);
      } finally {
        setSimilarLoading(false);
      }
    }

    if (id) {
      fetchSimilarJobs();
    }
  }, [id]);

  const handleApply = async () => {
    if (!session) {
      router.push("/login?callbackUrl=" + encodeURIComponent(`/jobs/${id}`));
      return;
    }

    setIsApplying(true);

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobListingId: id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to apply");
      }

      const data = await res.json();
      toast.success(`Applied successfully! +${data.xpEarned} XP earned!`);

      // Open external apply URL if available
      if (job?.applyUrl) {
        window.open(job.applyUrl, "_blank");
      }

      setJob((prev) => prev && { ...prev, hasApplied: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply");
    } finally {
      setIsApplying(false);
    }
  };

  const formatSalary = (salaryJob?: { salaryMin: number | null; salaryMax: number | null; salaryCurrency: string | null; salaryPeriod: string | null }) => {
    const j = salaryJob || job;
    if (!j?.salaryMin && !j?.salaryMax) return null;
    const currency = j.salaryCurrency || "USD";
    const period = j.salaryPeriod || "yearly";
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });

    if (j.salaryMin && j.salaryMax) {
      return `${formatter.format(j.salaryMin)} - ${formatter.format(j.salaryMax)}/${period === "yearly" ? "yr" : "hr"}`;
    }
    if (j.salaryMin) {
      return `${formatter.format(j.salaryMin)}+/${period === "yearly" ? "yr" : "hr"}`;
    }
    return `Up to ${formatter.format(j.salaryMax!)}/${period === "yearly" ? "yr" : "hr"}`;
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/jobs">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Jobs
        </Link>
      </Button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center shrink-0">
                  {job.companyLogo ? (
                    <img
                      src={job.companyLogo}
                      alt={job.company}
                      className="w-12 h-12 rounded object-contain"
                    />
                  ) : (
                    <Building2 className="w-8 h-8 text-violet-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-1">{job.title}</h1>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-medium text-foreground">{job.company}</span>
                    {job.companyWebsite && (
                      <a
                        href={job.companyWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-500 hover:text-violet-600"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 mt-4 text-sm">
                    {job.location && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </span>
                    )}
                    {job.jobType && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Briefcase className="w-4 h-4" />
                        {JOB_TYPES.find((t) => t.value === job.jobType)?.label || job.jobType}
                      </span>
                    )}
                    {job.remote && (
                      <Badge variant="secondary">
                        <Wifi className="w-3 h-3 mr-1" />
                        Remote
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>About the Role</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: job.description.replace(/\n/g, "<br>") }}
              />
            </CardContent>
          </Card>

          {/* Requirements */}
          {job.requirements && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: job.requirements.replace(/\n/g, "<br>") }}
                />
              </CardContent>
            </Card>
          )}

          {/* Benefits */}
          {job.benefits && (
            <Card>
              <CardHeader>
                <CardTitle>Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: job.benefits.replace(/\n/g, "<br>") }}
                />
              </CardContent>
            </Card>
          )}

          {/* Skills */}
          {job.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Similar Jobs Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                  Similar Jobs
                  {totalSimilar > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {totalSimilar} found
                    </Badge>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {similarLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : similarJobs.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {similarJobs.map((similarJob) => (
                    <Link key={similarJob.id} href={`/jobs/${similarJob.id}`}>
                      <div className="group p-4 border rounded-lg hover:border-violet-300 hover:shadow-md transition-all cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            {similarJob.companyLogo ? (
                              <img
                                src={similarJob.companyLogo}
                                alt={similarJob.company}
                                className="w-6 h-6 rounded object-contain"
                              />
                            ) : (
                              <Building2 className="w-4 h-4 text-violet-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm truncate group-hover:text-violet-600 transition-colors">
                                {similarJob.title}
                              </h4>
                              <Badge className="bg-violet-100 text-violet-700 text-xs shrink-0">
                                {similarJob.similarityScore}% match
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {similarJob.company}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              {similarJob.location && (
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3" />
                                  {similarJob.location}
                                </span>
                              )}
                              {similarJob.remote && (
                                <Badge variant="outline" className="text-xs py-0 px-1">
                                  Remote
                                </Badge>
                              )}
                            </div>
                            {similarJob.matchReasons.length > 0 && (
                              <p className="text-xs text-violet-600 mt-2 truncate">
                                {similarJob.matchReasons[0]}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-500 transition-colors shrink-0" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No similar jobs found at this time
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Apply Card */}
          <Card className="sticky top-24">
            <CardContent className="p-6 space-y-4">
              {job.hasApplied ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-2" />
                  <p className="font-medium text-green-600">Already Applied!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You&apos;ve already applied to this job
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Apply and earn</span>
                    <Badge className="bg-violet-500">
                      <Star className="w-3 h-3 mr-1" />+{XP_REWARDS.JOB_APPLICATION} XP
                    </Badge>
                  </div>
                  <Button
                    onClick={handleApply}
                    disabled={isApplying}
                    className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
                  >
                    {isApplying ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-2" />
                    )}
                    {isApplying ? "Applying..." : "Apply Now"}
                  </Button>
                </>
              )}

              <Separator />

              <div className="space-y-3">
                {formatSalary() && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{formatSalary()}</p>
                      <p className="text-xs text-muted-foreground">Salary Range</p>
                    </div>
                  </div>
                )}

                {job.experienceLevel && (
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {EXPERIENCE_LEVELS.find((l) => l.value === job.experienceLevel)?.label ||
                          job.experienceLevel}
                      </p>
                      <p className="text-xs text-muted-foreground">Experience Level</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{timeAgo(job.postedAt)}</p>
                    <p className="text-xs text-muted-foreground">Posted</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{job.applicationsCount}</p>
                    <p className="text-xs text-muted-foreground">Applicants</p>
                  </div>
                </div>

                {totalSimilar > 0 && (
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{totalSimilar} similar</p>
                      <p className="text-xs text-muted-foreground">Related jobs</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Learning Resources Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Level Up Your Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Boost your chances by improving skills for this role
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/resources">Browse Resources</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
