"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Briefcase,
  Building2,
  MapPin,
  Clock,
  ExternalLink,
  Loader2,
  Star,
  Filter,
  Wifi,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPLICATION_STATUSES, JOB_TYPES } from "@/lib/constants";

interface Application {
  id: string;
  status: string;
  xpEarned: number;
  appliedAt: string;
  jobListing: {
    id: string;
    title: string;
    company: string;
    companyLogo: string | null;
    location: string | null;
    jobType: string | null;
    remote: boolean;
  };
}

export default function ApplicationsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  useEffect(() => {
    async function fetchApplications() {
      try {
        const res = await fetch("/api/applications");
        if (res.ok) {
          const data = await res.json();
          setApplications(data);
        }
      } catch {
        toast.error("Failed to load applications");
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user) {
      fetchApplications();
    }
  }, [session]);

  const filteredApplications = statusFilter
    ? applications.filter((app) => app.status === statusFilter)
    : applications;

  const getStatusConfig = (status: string) => {
    return (
      APPLICATION_STATUSES.find((s) => s.value === status) || {
        value: status,
        label: status,
        color: "gray",
      }
    );
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

  const stats = {
    total: applications.length,
    applied: applications.filter((a) => a.status === "applied").length,
    interviewing: applications.filter((a) => a.status === "interviewing").length,
    offered: applications.filter((a) => a.status === "offered").length,
    totalXp: applications.reduce((acc, a) => acc + a.xpEarned, 0),
  };

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Applications</h1>
        <p className="text-muted-foreground">Track your job application progress</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.applied}</p>
            <p className="text-sm text-muted-foreground">Applied</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.interviewing}</p>
            <p className="text-sm text-muted-foreground">Interviewing</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.offered}</p>
            <p className="text-sm text-muted-foreground">Offers</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.totalXp}</p>
            <p className="text-sm opacity-90">XP Earned</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            {APPLICATION_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Briefcase className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {applications.length === 0 ? "No applications yet" : "No matching applications"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {applications.length === 0
                ? "Start applying to jobs to track your progress and earn XP!"
                : "Try changing your filter"}
            </p>
            {applications.length === 0 && (
              <Button asChild>
                <Link href="/jobs">Browse Jobs</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => {
            const statusConfig = getStatusConfig(app.status);
            return (
              <Card key={app.id} className="hover:border-violet-300 transition-colors">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Company Logo */}
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center shrink-0">
                      {app.jobListing.companyLogo ? (
                        <img
                          src={app.jobListing.companyLogo}
                          alt={app.jobListing.company}
                          className="w-10 h-10 rounded object-contain"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-violet-500" />
                      )}
                    </div>

                    {/* Job Info */}
                    <div className="flex-1">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                          <Link
                            href={`/jobs/${app.jobListing.id}`}
                            className="text-lg font-semibold hover:text-violet-600 transition-colors"
                          >
                            {app.jobListing.title}
                          </Link>
                          <p className="text-muted-foreground">{app.jobListing.company}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`shrink-0 ${
                            statusConfig.color === "blue"
                              ? "border-blue-500 text-blue-500"
                              : statusConfig.color === "yellow"
                              ? "border-yellow-500 text-yellow-500"
                              : statusConfig.color === "green"
                              ? "border-green-500 text-green-500"
                              : statusConfig.color === "red"
                              ? "border-red-500 text-red-500"
                              : "border-gray-500 text-gray-500"
                          }`}
                        >
                          {statusConfig.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {app.jobListing.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {app.jobListing.location}
                          </span>
                        )}
                        {app.jobListing.jobType && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {JOB_TYPES.find((t) => t.value === app.jobListing.jobType)?.label ||
                              app.jobListing.jobType}
                          </span>
                        )}
                        {app.jobListing.remote && (
                          <Badge variant="secondary" className="text-xs">
                            <Wifi className="w-3 h-3 mr-1" />
                            Remote
                          </Badge>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Applied {timeAgo(app.appliedAt)}
                        </span>
                        <span className="flex items-center gap-1 text-violet-600">
                          <Star className="w-4 h-4" />+{app.xpEarned} XP
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/jobs/${app.jobListing.id}`}>
                          View Job
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
