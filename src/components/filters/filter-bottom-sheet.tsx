"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Briefcase, GraduationCap, MapPin, Wifi, RotateCcw } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useFeed, FilterState } from "@/contexts/feed-context";
import { JOB_TYPES, EXPERIENCE_LEVELS, JOB_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface FilterBottomSheetProps {
  open: boolean;
  onClose: () => void;
}

export function FilterBottomSheet({ open, onClose }: FilterBottomSheetProps) {
  const { filters, setFilters, clearFilters } = useFeed();

  // Local state for form before applying
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  // Sync local state when filters change externally
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    setFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({
      jobType: "",
      experienceLevel: "",
      category: "",
      remote: false,
      location: "",
    });
  };

  const hasActiveFilters =
    localFilters.jobType ||
    localFilters.experienceLevel ||
    localFilters.category ||
    localFilters.remote ||
    localFilters.location;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl">Filters</SheetTitle>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-muted-foreground"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </SheetHeader>

          {/* Filter Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Category */}
            <FilterSection title="Category" icon={<Briefcase className="w-4 h-4" />}>
              <div className="flex flex-wrap gap-2">
                {JOB_CATEGORIES.map((cat) => (
                  <motion.button
                    key={cat.value}
                    onClick={() =>
                      setLocalFilters((prev) => ({
                        ...prev,
                        category: prev.category === cat.value ? "" : cat.value,
                      }))
                    }
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all",
                      localFilters.category === cat.value
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted hover:bg-muted/80"
                    )}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="mr-1">{cat.icon}</span>
                    {cat.label}
                  </motion.button>
                ))}
              </div>
            </FilterSection>

            {/* Job Type */}
            <FilterSection title="Job Type" icon={<Briefcase className="w-4 h-4" />}>
              <div className="flex flex-wrap gap-2">
                {JOB_TYPES.map((type) => (
                  <motion.button
                    key={type.value}
                    onClick={() =>
                      setLocalFilters((prev) => ({
                        ...prev,
                        jobType: prev.jobType === type.value ? "" : type.value,
                      }))
                    }
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all",
                      localFilters.jobType === type.value
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted hover:bg-muted/80"
                    )}
                    whileTap={{ scale: 0.95 }}
                  >
                    {type.label}
                  </motion.button>
                ))}
              </div>
            </FilterSection>

            {/* Experience Level */}
            <FilterSection title="Experience Level" icon={<GraduationCap className="w-4 h-4" />}>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_LEVELS.map((level) => (
                  <motion.button
                    key={level.value}
                    onClick={() =>
                      setLocalFilters((prev) => ({
                        ...prev,
                        experienceLevel: prev.experienceLevel === level.value ? "" : level.value,
                      }))
                    }
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all",
                      localFilters.experienceLevel === level.value
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted hover:bg-muted/80"
                    )}
                    whileTap={{ scale: 0.95 }}
                  >
                    {level.label}
                  </motion.button>
                ))}
              </div>
            </FilterSection>

            {/* Location */}
            <FilterSection title="Location" icon={<MapPin className="w-4 h-4" />}>
              <Input
                placeholder="City, State, or ZIP"
                value={localFilters.location}
                onChange={(e) =>
                  setLocalFilters((prev) => ({ ...prev, location: e.target.value }))
                }
                className="rounded-xl"
              />
            </FilterSection>

            {/* Remote Toggle */}
            <FilterSection title="Work Type" icon={<Wifi className="w-4 h-4" />}>
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Wifi className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <Label htmlFor="remote-toggle" className="font-medium">
                      Remote Only
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Show only remote positions
                    </p>
                  </div>
                </div>
                <Switch
                  id="remote-toggle"
                  checked={localFilters.remote}
                  onCheckedChange={(checked) =>
                    setLocalFilters((prev) => ({ ...prev, remote: checked }))
                  }
                />
              </div>
            </FilterSection>
          </div>

          {/* Apply Button */}
          <div className="p-6 pt-4 border-t bg-background safe-bottom">
            <Button
              onClick={handleApply}
              className="w-full gradient-bg text-white font-semibold py-6 rounded-xl"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FilterSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}
