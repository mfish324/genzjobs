"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SaveJobButtonProps {
  jobId: string;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost";
  showText?: boolean;
  initialSaved?: boolean;
  onSaveChange?: (saved: boolean) => void;
}

export function SaveJobButton({
  jobId,
  className,
  size = "icon",
  variant = "ghost",
  showText = false,
  initialSaved = false,
  onSaveChange,
}: SaveJobButtonProps) {
  const { data: session } = useSession();
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsSaved(initialSaved);
  }, [initialSaved]);

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      // Redirect to login or show toast
      window.location.href = "/login?callbackUrl=" + encodeURIComponent(window.location.pathname);
      return;
    }

    setIsLoading(true);
    try {
      if (isSaved) {
        // Unsave
        const res = await fetch(`/api/saved-jobs?jobListingId=${jobId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setIsSaved(false);
          onSaveChange?.(false);
        }
      } else {
        // Save
        const res = await fetch("/api/saved-jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobListingId: jobId }),
        });
        if (res.ok) {
          setIsSaved(true);
          onSaveChange?.(true);
        }
      }
    } catch (error) {
      console.error("Failed to toggle save:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleSave}
      disabled={isLoading}
      className={cn(
        "transition-all",
        isSaved && "text-violet-500 hover:text-violet-600",
        className
      )}
      title={isSaved ? "Remove from saved" : "Save for later"}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isSaved ? (
        <BookmarkCheck className="w-4 h-4" />
      ) : (
        <Bookmark className="w-4 h-4" />
      )}
      {showText && (
        <span className="ml-2">{isSaved ? "Saved" : "Save"}</span>
      )}
    </Button>
  );
}
