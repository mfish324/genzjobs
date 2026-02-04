"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Wifi, Briefcase, GraduationCap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useFeed } from "@/contexts/feed-context";
import { JOB_TYPES, EXPERIENCE_LEVELS, JOB_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function FilterChips() {
  const { filters, setFilters } = useFeed();

  const activeFilters: Array<{
    key: keyof typeof filters;
    label: string;
    icon: React.ReactNode;
    value: string | boolean;
  }> = [];

  // Category
  if (filters.category) {
    const cat = JOB_CATEGORIES.find((c) => c.value === filters.category);
    if (cat) {
      activeFilters.push({
        key: "category",
        label: cat.label,
        icon: <span className="text-xs">{cat.icon}</span>,
        value: filters.category,
      });
    }
  }

  // Job Type
  if (filters.jobType) {
    const type = JOB_TYPES.find((t) => t.value === filters.jobType);
    if (type) {
      activeFilters.push({
        key: "jobType",
        label: type.label,
        icon: <Briefcase className="w-3 h-3" />,
        value: filters.jobType,
      });
    }
  }

  // Experience Level
  if (filters.experienceLevel) {
    const level = EXPERIENCE_LEVELS.find((l) => l.value === filters.experienceLevel);
    if (level) {
      activeFilters.push({
        key: "experienceLevel",
        label: level.label.split(" ")[0], // Just "Entry", "Mid", "Senior"
        icon: <GraduationCap className="w-3 h-3" />,
        value: filters.experienceLevel,
      });
    }
  }

  // Location
  if (filters.location) {
    activeFilters.push({
      key: "location",
      label: filters.location,
      icon: <MapPin className="w-3 h-3" />,
      value: filters.location,
    });
  }

  // Remote
  if (filters.remote) {
    activeFilters.push({
      key: "remote",
      label: "Remote",
      icon: <Wifi className="w-3 h-3" />,
      value: true,
    });
  }

  const removeFilter = (key: keyof typeof filters) => {
    if (key === "remote") {
      setFilters({ [key]: false });
    } else {
      setFilters({ [key]: "" });
    }
  };

  if (activeFilters.length === 0) {
    return (
      <div className="flex-1 overflow-hidden">
        <p className="text-sm text-muted-foreground truncate">All jobs</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2">
        <AnimatePresence mode="popLayout">
          {activeFilters.map((filter) => (
            <motion.div
              key={filter.key}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <Badge
                variant="secondary"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
                  "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer",
                  "whitespace-nowrap"
                )}
                onClick={() => removeFilter(filter.key)}
              >
                {filter.icon}
                <span className="text-xs font-medium">{filter.label}</span>
                <X className="w-3 h-3 ml-0.5 opacity-60 hover:opacity-100" />
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
