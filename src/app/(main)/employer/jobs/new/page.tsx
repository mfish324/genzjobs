"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Briefcase, ArrowLeft, Loader2, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const JOB_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Freelance",
  "Temporary",
];

const EXPERIENCE_LEVELS = [
  "Entry Level",
  "Mid Level",
  "Senior Level",
  "Lead",
  "Manager",
  "Executive",
];

const SALARY_PERIODS = ["year", "month", "hour"];

const COMMON_SKILLS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Python",
  "Java",
  "SQL",
  "AWS",
  "Docker",
  "Git",
  "Communication",
  "Leadership",
  "Problem Solving",
  "Teamwork",
  "Project Management",
];

export default function NewJobPostingPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasEmployer, setHasEmployer] = useState<boolean | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    jobType: "",
    experienceLevel: "",
    description: "",
    requirements: "",
    responsibilities: "",
    benefits: "",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: [] as string[],
    remote: false,
    applicationInstructions: "",
  });

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/employer/jobs/new");
    }
  }, [authStatus, router]);

  useEffect(() => {
    async function checkEmployer() {
      if (!session?.user) return;

      try {
        const res = await fetch("/api/employer");
        if (res.ok) {
          const data = await res.json();
          setHasEmployer(!!data);
          if (!data) {
            router.push("/employer/register");
          }
        } else {
          setHasEmployer(false);
          router.push("/employer/register");
        }
      } catch {
        setHasEmployer(false);
      }
    }

    if (session?.user) {
      checkEmployer();
    }
  }, [session, router]);

  const handleAddSkill = (skill: string) => {
    const trimmedSkill = skill.trim();
    if (trimmedSkill && !formData.skills.includes(trimmedSkill)) {
      setFormData({ ...formData, skills: [...formData.skills, trimmedSkill] });
    }
    setSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skillToRemove),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
        salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
      };

      const res = await fetch("/api/employer/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create job posting");
      }

      toast.success("Job posted successfully!");
      router.push("/employer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post job");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authStatus === "loading" || hasEmployer === null) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/employer">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Employer Portal
        </Link>
      </Button>

      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>Post a New Job</CardTitle>
                <CardDescription>
                  Create a job listing to attract Gen-Z talent
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Basic Information</h3>

                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g. Software Engineer"
                    required
                    minLength={5}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      placeholder="e.g. San Francisco, CA"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jobType">Job Type</Label>
                    <Select
                      value={formData.jobType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, jobType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="experienceLevel">Experience Level</Label>
                    <Select
                      value={formData.experienceLevel}
                      onValueChange={(value) =>
                        setFormData({ ...formData, experienceLevel: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPERIENCE_LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-4 pt-8">
                    <Switch
                      id="remote"
                      checked={formData.remote}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, remote: checked })
                      }
                    />
                    <Label htmlFor="remote">Remote position</Label>
                  </div>
                </div>
              </div>

              {/* Salary */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Compensation</h3>

                <div className="grid md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salaryMin">Min Salary</Label>
                    <Input
                      id="salaryMin"
                      type="number"
                      value={formData.salaryMin}
                      onChange={(e) =>
                        setFormData({ ...formData, salaryMin: e.target.value })
                      }
                      placeholder="50000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salaryMax">Max Salary</Label>
                    <Input
                      id="salaryMax"
                      type="number"
                      value={formData.salaryMax}
                      onChange={(e) =>
                        setFormData({ ...formData, salaryMax: e.target.value })
                      }
                      placeholder="80000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salaryCurrency">Currency</Label>
                    <Select
                      value={formData.salaryCurrency}
                      onValueChange={(value) =>
                        setFormData({ ...formData, salaryCurrency: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="AUD">AUD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salaryPeriod">Period</Label>
                    <Select
                      value={formData.salaryPeriod}
                      onValueChange={(value) =>
                        setFormData({ ...formData, salaryPeriod: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SALARY_PERIODS.map((period) => (
                          <SelectItem key={period} value={period}>
                            per {period}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Job Details</h3>

                <div className="space-y-2">
                  <Label htmlFor="description">Job Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe the role, what the candidate will be doing, and why this is a great opportunity..."
                    rows={5}
                    required
                    minLength={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 50 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements">Requirements</Label>
                  <Textarea
                    id="requirements"
                    value={formData.requirements}
                    onChange={(e) =>
                      setFormData({ ...formData, requirements: e.target.value })
                    }
                    placeholder="List the qualifications, skills, and experience required..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsibilities">Responsibilities</Label>
                  <Textarea
                    id="responsibilities"
                    value={formData.responsibilities}
                    onChange={(e) =>
                      setFormData({ ...formData, responsibilities: e.target.value })
                    }
                    placeholder="List the key responsibilities and duties..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="benefits">Benefits</Label>
                  <Textarea
                    id="benefits"
                    value={formData.benefits}
                    onChange={(e) =>
                      setFormData({ ...formData, benefits: e.target.value })
                    }
                    placeholder="List the perks and benefits (health insurance, PTO, etc.)..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Required Skills</h3>

                <div className="space-y-2">
                  <Label>Add Skills</Label>
                  <div className="flex gap-2">
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSkill(skillInput);
                        }
                      }}
                      placeholder="Type a skill and press Enter"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleAddSkill(skillInput)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Common skills (click to add):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_SKILLS.filter(
                      (s) => !formData.skills.includes(s)
                    ).map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="cursor-pointer hover:bg-violet-100"
                        onClick={() => handleAddSkill(skill)}
                      >
                        + {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Application Instructions */}
              <div className="space-y-2">
                <Label htmlFor="applicationInstructions">
                  Application Instructions
                </Label>
                <Textarea
                  id="applicationInstructions"
                  value={formData.applicationInstructions}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      applicationInstructions: e.target.value,
                    })
                  }
                  placeholder="Any special instructions for applicants..."
                  rows={2}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-violet-500 hover:bg-violet-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Posting Job...
                  </>
                ) : (
                  <>
                    <Briefcase className="w-4 h-4 mr-2" />
                    Post Job
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
