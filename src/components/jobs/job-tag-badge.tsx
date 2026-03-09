"use client";

import { Badge } from "@/components/ui/badge";
import { TAG_DEFINITIONS } from "@/lib/job-tags";

interface JobTagBadgeProps {
  tagId: string;
  size?: "sm" | "default";
}

export function JobTagBadge({ tagId, size = "sm" }: JobTagBadgeProps) {
  const tag = TAG_DEFINITIONS[tagId];
  if (!tag) return null;

  const Icon = tag.icon;

  return (
    <Badge
      variant="outline"
      className={`${tag.colorClass} ${size === "sm" ? "text-xs px-1.5 py-0" : "text-xs"} border`}
    >
      <Icon className={`${size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} mr-1`} />
      {tag.label}
    </Badge>
  );
}
