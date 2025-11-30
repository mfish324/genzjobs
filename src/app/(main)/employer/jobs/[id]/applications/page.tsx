"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Users,
  Mail,
  MapPin,
  Calendar,
  FileText,
  ExternalLink,
  Briefcase,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Application {
  id: string;
  status: string;
  appliedAt: string;
  coverLetter: string | null;
  resumeUrl: string | null;
  notes: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    title: string | null;
    location: string | null;
    skills: string[];
    experienceYears: number | null;
  };
}

interface JobData {
  job: {
    id: string;
    title: string;
    location: string | null;
    jobType: string | null;
  };
  applications: Application[];
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-gray-500" },
  { value: "reviewing", label: "Reviewing", color: "bg-blue-500" },
  { value: "interviewed", label: "Interviewed", color: "bg-purple-500" },
  { value: "offered", label: "Offered", color: "bg-green-500" },
  { value: "hired", label: "Hired", color: "bg-emerald-600" },
  { value: "rejected", label: "Rejected", color: "bg-red-500" },
];

export default function JobApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: jobId } = use(params);
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [data, setData] = useState<JobData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  useEffect(() => {
    async function fetchApplications() {
      try {
        const res = await fetch(`/api/employer/jobs/${jobId}/applications`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        } else {
          toast.error("Failed to load applications");
          router.push("/employer");
        }
      } catch {
        toast.error("Failed to load applications");
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus === "authenticated") {
      fetchApplications();
    }
  }, [authStatus, jobId, router]);

  const updateApplicationStatus = async (
    applicationId: string,
    status: string,
    notes?: string
  ) => {
    setUpdatingId(applicationId);

    try {
      const res = await fetch(`/api/employer/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });

      if (!res.ok) {
        throw new Error("Failed to update");
      }

      // Update local state
      if (data) {
        setData({
          ...data,
          applications: data.applications.map((app) =>
            app.id === applicationId ? { ...app, status, notes: notes || app.notes } : app
          ),
        });
      }

      toast.success("Application updated");
    } catch {
      toast.error("Failed to update application");
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find((o) => o.value === status);
    return (
      <Badge className={option?.color || "bg-gray-500"}>
        {option?.label || status}
      </Badge>
    );
  };

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/employer">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Employer Portal
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Applications</h1>
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            {data.job.title}
          </span>
          {data.job.location && (
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {data.job.location}
            </span>
          )}
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {data.applications.length} applicant
            {data.applications.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {data.applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold mb-2">No applications yet</h3>
            <p className="text-muted-foreground">
              Applications will appear here when candidates apply
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.applications.map((application) => (
            <Card key={application.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={application.user.image || undefined} />
                      <AvatarFallback>
                        {application.user.name?.charAt(0) ||
                          application.user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">
                          {application.user.name || "Anonymous"}
                        </h3>
                        {getStatusBadge(application.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {application.user.email}
                        </span>
                        {application.user.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {application.user.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Applied {formatDate(application.appliedAt)}
                        </span>
                      </div>
                      {application.user.title && (
                        <p className="text-sm mb-2">{application.user.title}</p>
                      )}
                      {application.user.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {application.user.skills.slice(0, 5).map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {application.user.skills.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{application.user.skills.length - 5} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {application.resumeUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={application.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Resume
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                    )}

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Application Details</DialogTitle>
                          <DialogDescription>
                            Review and update this application
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-16 h-16">
                              <AvatarImage
                                src={application.user.image || undefined}
                              />
                              <AvatarFallback>
                                {application.user.name?.charAt(0) ||
                                  application.user.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="text-lg font-semibold">
                                {application.user.name || "Anonymous"}
                              </h3>
                              <p className="text-muted-foreground">
                                {application.user.email}
                              </p>
                              {application.user.title && (
                                <p>{application.user.title}</p>
                              )}
                            </div>
                          </div>

                          {application.coverLetter && (
                            <div>
                              <h4 className="font-semibold mb-2">Cover Letter</h4>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {application.coverLetter}
                              </p>
                            </div>
                          )}

                          <div>
                            <h4 className="font-semibold mb-2">Update Status</h4>
                            <Select
                              value={application.status}
                              onValueChange={(value) =>
                                updateApplicationStatus(application.id, value)
                              }
                              disabled={updatingId === application.id}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Internal Notes</h4>
                            <Textarea
                              defaultValue={application.notes || ""}
                              placeholder="Add notes about this candidate..."
                              rows={3}
                              onBlur={(e) => {
                                if (e.target.value !== (application.notes || "")) {
                                  updateApplicationStatus(
                                    application.id,
                                    application.status,
                                    e.target.value
                                  );
                                }
                              }}
                            />
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Select
                      value={application.status}
                      onValueChange={(value) =>
                        updateApplicationStatus(application.id, value)
                      }
                      disabled={updatingId === application.id}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
