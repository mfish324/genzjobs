"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ResumeData {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  skills: string[];
  allowComparison: boolean;
  comparisonOptInAt: string | null;
  uniquenessScore: number | null;
  similarCount90: number | null;
  similarCount80: number | null;
  lastAnalyzedAt: string | null;
  uploadedAt: string;
}

interface ResumeUploadProps {
  initialResume?: ResumeData | null;
  onUploadSuccess?: (resume: ResumeData) => void;
}

export function ResumeUpload({ initialResume, onUploadSuccess }: ResumeUploadProps) {
  const [resume, setResume] = useState<ResumeData | null>(initialResume || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptingIn, setIsOptingIn] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    uniquenessScore: number;
    similarCount90: number;
    similarCount80: number;
    totalCompared: number;
    percentileRank: number;
    tips: string[];
    strengths: string[];
  } | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      toast.success("Resume uploaded successfully!");

      // Fetch updated resume data
      const resumeRes = await fetch("/api/resume/upload");
      const resumeData = await resumeRes.json();
      setResume(resumeData.resume);
      onUploadSuccess?.(resumeData.resume);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload resume");
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/resume/upload", { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      toast.success("Resume deleted");
      setResume(null);
      setAnalysisResult(null);
    } catch (error) {
      toast.error("Failed to delete resume");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOptInChange = async (optIn: boolean) => {
    if (optIn) {
      setShowPrivacyDialog(true);
      return;
    }

    // Opting out
    setIsOptingIn(true);
    try {
      const res = await fetch("/api/resume/opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optIn: false }),
      });

      if (!res.ok) throw new Error("Failed to update preferences");

      setResume((prev) => prev ? { ...prev, allowComparison: false } : null);
      setAnalysisResult(null);
      toast.success("Opted out of comparison");
    } catch (error) {
      toast.error("Failed to update preferences");
    } finally {
      setIsOptingIn(false);
    }
  };

  const confirmOptIn = async () => {
    setShowPrivacyDialog(false);
    setIsOptingIn(true);

    try {
      const res = await fetch("/api/resume/opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optIn: true }),
      });

      if (!res.ok) throw new Error("Failed to update preferences");

      setResume((prev) => prev ? { ...prev, allowComparison: true } : null);
      toast.success("Opted in to comparison! You can now analyze your resume uniqueness.");
    } catch (error) {
      toast.error("Failed to update preferences");
    } finally {
      setIsOptingIn(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/resume/analyze", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setAnalysisResult(data);
      setResume((prev) => prev ? {
        ...prev,
        uniquenessScore: data.uniquenessScore,
        similarCount90: data.similarCount90,
        similarCount80: data.similarCount80,
        lastAnalyzedAt: new Date().toISOString(),
      } : null);

      toast.success("Resume analysis complete!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to analyze resume");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-yellow-600";
    return "text-orange-600";
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!resume ? (
        <Card>
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isDragActive
                  ? "border-violet-500 bg-violet-50"
                  : "border-muted-foreground/25 hover:border-violet-400 hover:bg-muted/50"
              )}
            >
              <input {...getInputProps()} />
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
                  <p className="text-sm text-muted-foreground">Uploading and analyzing...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-1">
                    {isDragActive ? "Drop your resume here" : "Upload your resume"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Drag & drop or click to select
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports PDF and Word documents (max 5MB)
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Current Resume Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-violet-500" />
                    Your Resume
                  </CardTitle>
                  <CardDescription>
                    Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-violet-500" />
                  <div>
                    <p className="font-medium text-sm">{resume.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(resume.fileSize)}
                    </p>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>

              {/* Extracted Skills */}
              {resume.skills.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Extracted Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {resume.skills.slice(0, 10).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {resume.skills.length > 10 && (
                      <Badge variant="outline" className="text-xs">
                        +{resume.skills.length - 10} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Replace Resume */}
              <div
                {...getRootProps()}
                className="text-center p-3 border border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <input {...getInputProps()} />
                <p className="text-sm text-muted-foreground">
                  {isUploading ? "Uploading..." : "Click or drag to replace"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Opt-In */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resume Comparison</CardTitle>
              <CardDescription>
                Compare your resume with other GenZJobs users to see how unique it is
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="comparison-toggle" className="text-sm font-medium">
                    Allow Anonymous Comparison
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Your resume content is never shared with other users
                  </p>
                </div>
                <Switch
                  id="comparison-toggle"
                  checked={resume.allowComparison}
                  onCheckedChange={handleOptInChange}
                  disabled={isOptingIn}
                />
              </div>

              {resume.allowComparison && (
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    "Analyze Uniqueness"
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Analysis Results */}
          {analysisResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Uniqueness Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Score Display */}
                <div className="text-center">
                  <div className={cn("text-5xl font-bold mb-2", getScoreColor(analysisResult.uniquenessScore))}>
                    {analysisResult.uniquenessScore}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your resume is more unique than {analysisResult.percentileRank}% of users
                  </p>
                  <Progress
                    value={analysisResult.uniquenessScore}
                    className="h-2 mt-4"
                  />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{analysisResult.similarCount90}</p>
                    <p className="text-xs text-muted-foreground">90%+ similar</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{analysisResult.similarCount80}</p>
                    <p className="text-xs text-muted-foreground">80%+ similar</p>
                  </div>
                </div>

                {/* Strengths */}
                {analysisResult.strengths.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Your Strengths
                    </p>
                    <ul className="space-y-1">
                      {analysisResult.strengths.map((strength, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tips */}
                {analysisResult.tips.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-1">
                      <Info className="w-4 h-4 text-blue-500" />
                      Tips to Stand Out
                    </p>
                    <ul className="space-y-2">
                      {analysisResult.tips.map((tip, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-violet-500 mt-0.5">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Compared against {analysisResult.totalCompared} opted-in resumes
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Privacy Dialog */}
      <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resume Comparison Privacy Notice</DialogTitle>
            <DialogDescription className="pt-4 space-y-3">
              <p>
                By opting in, you agree to have your resume compared <strong>anonymously</strong> with
                other GenZJobs users who have also opted in.
              </p>

              <div className="bg-muted p-3 rounded-lg space-y-2">
                <p className="font-medium text-foreground text-sm">What we share:</p>
                <p className="text-sm">Only your similarity score and general statistics</p>
              </div>

              <div className="bg-muted p-3 rounded-lg space-y-2">
                <p className="font-medium text-foreground text-sm">What we DON&apos;T share:</p>
                <p className="text-sm">Your resume content, personal details, or identity</p>
              </div>

              <p className="text-sm">
                You can opt out at any time from your profile settings, and your data will no longer
                be used for comparisons.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrivacyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmOptIn} className="bg-violet-500 hover:bg-violet-600">
              I Agree, Opt Me In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
