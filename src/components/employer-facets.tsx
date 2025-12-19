"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface FacetItem {
  name: string;
  count: number;
}

interface FacetsData {
  employers: FacetItem[];
  skills: FacetItem[];
  jobTypes: FacetItem[];
  experienceLevels: FacetItem[];
}

interface EmployerFacetsProps {
  searchParams: {
    search?: string;
    location?: string;
    jobType?: string;
    experienceLevel?: string;
    category?: string;
    remote?: boolean;
    usOnly?: boolean;
  };
  selectedEmployers: string[];
  onEmployersChange: (employers: string[]) => void;
  className?: string;
}

export function EmployerFacets({
  searchParams,
  selectedEmployers,
  onEmployersChange,
  className,
}: EmployerFacetsProps) {
  const [facets, setFacets] = useState<FacetsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    employers: true,
    skills: false,
    jobTypes: false,
    experienceLevels: false,
  });
  const [showAllEmployers, setShowAllEmployers] = useState(false);

  useEffect(() => {
    const fetchFacets = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchParams.search) params.set("search", searchParams.search);
        if (searchParams.location) params.set("location", searchParams.location);
        if (searchParams.jobType) params.set("jobType", searchParams.jobType);
        if (searchParams.experienceLevel) params.set("experienceLevel", searchParams.experienceLevel);
        if (searchParams.category) params.set("category", searchParams.category);
        if (searchParams.remote) params.set("remote", "true");
        if (searchParams.usOnly) params.set("usOnly", "true");

        const response = await fetch(`/api/jobs/facets?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setFacets(data);
        }
      } catch (error) {
        console.error("Failed to fetch facets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFacets();
  }, [searchParams]);

  const toggleEmployer = (employer: string) => {
    if (selectedEmployers.includes(employer)) {
      onEmployersChange(selectedEmployers.filter((e) => e !== employer));
    } else {
      onEmployersChange([...selectedEmployers, employer]);
    }
  };

  const clearAllEmployers = () => {
    onEmployersChange([]);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const displayedEmployers = showAllEmployers
    ? facets?.employers || []
    : (facets?.employers || []).slice(0, 10);

  if (loading) {
    return (
      <div className={cn("space-y-4 p-4", className)}>
        <Skeleton className="h-6 w-32" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
    );
  }

  if (!facets) {
    return null;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Selected Employers Pills */}
      {selectedEmployers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Filtered by:
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllEmployers}
              className="h-6 px-2 text-xs"
            >
              Clear all
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedEmployers.map((employer) => (
              <Badge
                key={employer}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                onClick={() => toggleEmployer(employer)}
              >
                {employer}
                <X className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Employers Section */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection("employers")}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Top Employers</span>
          </div>
          {expandedSections.employers ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {expandedSections.employers && (
          <div className="space-y-1 pl-1">
            {displayedEmployers.map((employer) => (
              <label
                key={employer.name}
                className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors group"
              >
                <Checkbox
                  checked={selectedEmployers.includes(employer.name)}
                  onCheckedChange={() => toggleEmployer(employer.name)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className="flex-1 text-sm truncate group-hover:text-foreground">
                  {employer.name}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {employer.count}
                </span>
              </label>
            ))}

            {facets.employers.length > 10 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllEmployers(!showAllEmployers)}
                className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                {showAllEmployers
                  ? "Show less"
                  : `Show ${facets.employers.length - 10} more`}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Job Types Section */}
      {facets.jobTypes.length > 0 && (
        <div className="space-y-3 border-t pt-4">
          <button
            onClick={() => toggleSection("jobTypes")}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="font-semibold text-sm">Job Type</span>
            {expandedSections.jobTypes ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {expandedSections.jobTypes && (
            <div className="space-y-1 pl-1">
              {facets.jobTypes.map((type) => (
                <div
                  key={type.name}
                  className="flex items-center justify-between py-1.5 px-2 text-sm"
                >
                  <span className="text-muted-foreground">{type.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {type.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Experience Levels Section */}
      {facets.experienceLevels.length > 0 && (
        <div className="space-y-3 border-t pt-4">
          <button
            onClick={() => toggleSection("experienceLevels")}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="font-semibold text-sm">Experience Level</span>
            {expandedSections.experienceLevels ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {expandedSections.experienceLevels && (
            <div className="space-y-1 pl-1">
              {facets.experienceLevels.map((level) => (
                <div
                  key={level.name}
                  className="flex items-center justify-between py-1.5 px-2 text-sm"
                >
                  <span className="text-muted-foreground">{level.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {level.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Top Skills Section */}
      {facets.skills.length > 0 && (
        <div className="space-y-3 border-t pt-4">
          <button
            onClick={() => toggleSection("skills")}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="font-semibold text-sm">Top Skills</span>
            {expandedSections.skills ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {expandedSections.skills && (
            <div className="flex flex-wrap gap-1.5 pl-1">
              {facets.skills.slice(0, 12).map((skill) => (
                <Badge
                  key={skill.name}
                  variant="outline"
                  className="text-xs font-normal"
                >
                  {skill.name}
                  <span className="ml-1 text-muted-foreground">
                    ({skill.count})
                  </span>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
