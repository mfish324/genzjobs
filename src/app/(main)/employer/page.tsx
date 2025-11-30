"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Building2,
  Briefcase,
  Users,
  Plus,
  Loader2,
  Settings,
  Eye,
  Edit,
  MoreHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface JobPosting {
  id: string;
  title: string;
  location: string | null;
  jobType: string | null;
  isActive: boolean;
  postedAt: string;
  _count: {
    applications: number;
  };
}

interface Employer {
  id: string;
  companyName: string;
  website: string | null;
  industry: string | null;
  size: string | null;
  description: string | null;
  headquarters: string | null;
  isVerified: boolean;
  jobPostings: JobPosting[];
}

export default function EmployerPortalPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/employer");
    }
  }, [authStatus, router]);

  useEffect(() => {
    async function fetchEmployer() {
      try {
        const res = await fetch("/api/employer");
        if (res.ok) {
          const data = await res.json();
          setEmployer(data);
        }
      } catch {
        toast.error("Failed to load employer data");
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user) {
      fetchEmployer();
    }
  }, [session]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  // Not registered as employer - show registration
  if (!employer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="py-16 text-center">
              <Building2 className="w-16 h-16 mx-auto text-violet-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Employer Portal</h2>
              <p className="text-muted-foreground mb-6">
                Register your company to post jobs and connect with Gen-Z talent
              </p>
              <Button asChild className="bg-violet-500 hover:bg-violet-600">
                <Link href="/employer/register">
                  <Building2 className="w-4 h-4 mr-2" />
                  Register as Employer
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const stats = {
    totalJobs: employer.jobPostings.length,
    activeJobs: employer.jobPostings.filter((j) => j.isActive).length,
    totalApplications: employer.jobPostings.reduce(
      (acc, j) => acc + j._count.applications,
      0
    ),
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Employer Portal</h1>
          <p className="text-muted-foreground">
            Manage your job postings and view applications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/employer/settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </Button>
          <Button asChild className="bg-violet-500 hover:bg-violet-600">
            <Link href="/employer/jobs/new">
              <Plus className="w-4 h-4 mr-2" />
              Post a Job
            </Link>
          </Button>
        </div>
      </div>

      {/* Company Info */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{employer.companyName}</h2>
                {employer.isVerified && (
                  <Badge className="bg-green-500">Verified</Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {employer.industry || "Industry not set"} •{" "}
                {employer.headquarters || "Location not set"}
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/employer/settings">
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalJobs}</p>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Eye className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeJobs}</p>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalApplications}</p>
                <p className="text-sm text-muted-foreground">Applications</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Postings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Job Postings</CardTitle>
            <CardDescription>Manage your active and past job postings</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {employer.jobPostings.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-2">No job postings yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first job posting to start receiving applications
              </p>
              <Button asChild>
                <Link href="/employer/jobs/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Post a Job
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {employer.jobPostings.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{job.title}</h3>
                      <Badge variant={job.isActive ? "default" : "secondary"}>
                        {job.isActive ? "Active" : "Closed"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {job.location && <span>{job.location}</span>}
                      {job.jobType && <span>{job.jobType}</span>}
                      <span>Posted {formatDate(job.postedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">{job._count.applications}</p>
                      <p className="text-xs text-muted-foreground">Applications</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/employer/jobs/${job.id}/applications`}>
                            <Users className="w-4 h-4 mr-2" />
                            View Applications
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/employer/jobs/${job.id}/edit`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Job
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
