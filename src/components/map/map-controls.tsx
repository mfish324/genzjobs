"use client";

import { Globe, MapPin, Search, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPERIENCE_LEVELS, JOB_TYPES, JOB_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface MapControlsProps {
  view: "us" | "world";
  onViewChange: (view: "us" | "world") => void;
  experienceLevel: string;
  onExperienceLevelChange: (level: string) => void;
  jobType: string;
  onJobTypeChange: (type: string) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  remote: boolean;
  onRemoteChange: (remote: boolean) => void;
  search: string;
  onSearchChange: (search: string) => void;
  location: string;
  onLocationChange: (location: string) => void;
  usOnly: boolean;
  onUsOnlyChange: (usOnly: boolean) => void;
}

export function MapControls({
  view,
  onViewChange,
  experienceLevel,
  onExperienceLevelChange,
  jobType,
  onJobTypeChange,
  category,
  onCategoryChange,
  remote,
  onRemoteChange,
  search,
  onSearchChange,
  location,
  onLocationChange,
  usOnly,
  onUsOnlyChange,
}: MapControlsProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* View Switcher */}
      <div className="flex items-center gap-2 p-1 bg-muted rounded-xl">
        <Button
          variant={view === "us" ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewChange("us")}
          className={cn(
            "flex-1 gap-2",
            view === "us" && "gradient-bg text-white"
          )}
        >
          <MapPin className="w-4 h-4" />
          US Map
        </Button>
        <Button
          variant={view === "world" ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewChange("world")}
          className={cn(
            "flex-1 gap-2",
            view === "world" && "gradient-bg text-white"
          )}
        >
          <Globe className="w-4 h-4" />
          World Map
        </Button>
      </div>

      {/* Search & Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs, companies..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Location"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Experience Level */}
        <Select value={experienceLevel} onValueChange={onExperienceLevelChange}>
          <SelectTrigger>
            <SelectValue placeholder="Experience Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {EXPERIENCE_LEVELS.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Job Type */}
        <Select value={jobType} onValueChange={onJobTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Job Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {JOB_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category */}
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {JOB_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Remote Toggle */}
        <Button
          variant={remote ? "default" : "outline"}
          size="default"
          onClick={() => onRemoteChange(!remote)}
          className={cn(remote && "gradient-bg text-white")}
        >
          {remote ? "Remote Only" : "All Locations"}
        </Button>

        {/* US Only Toggle */}
        <Button
          variant={usOnly ? "default" : "outline"}
          size="default"
          onClick={() => onUsOnlyChange(!usOnly)}
          className={cn(usOnly && "bg-blue-500 hover:bg-blue-600 text-white")}
        >
          <Flag className="w-4 h-4 mr-2" />
          {usOnly ? "US Only" : "Worldwide"}
        </Button>
      </div>
    </div>
  );
}
