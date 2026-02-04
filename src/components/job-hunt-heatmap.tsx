"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface DayData {
  date: string;
  applications: number;
  interviews: number;
  offers: number;
}

interface HeatmapData {
  days: DayData[];
  totalApplications: number;
  totalInterviews: number;
  totalOffers: number;
  successRate: number;
  bestDay: string;
  currentStreak: number;
  longestStreak: number;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getIntensityColor(count: number): string {
  if (count === 0) return "bg-muted";
  if (count === 1) return "bg-green-200 dark:bg-green-900";
  if (count === 2) return "bg-green-300 dark:bg-green-800";
  if (count <= 4) return "bg-green-400 dark:bg-green-700";
  return "bg-green-500 dark:bg-green-600";
}

function getWeeksArray(year: number): Date[][] {
  const weeks: Date[][] = [];
  const startDate = new Date(year, 0, 1);
  // Adjust to start from Sunday
  const dayOfWeek = startDate.getDay();
  startDate.setDate(startDate.getDate() - dayOfWeek);

  let currentWeek: Date[] = [];

  for (let i = 0; i < 371; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    if (date.getFullYear() > year && date.getMonth() > 0) break;

    currentWeek.push(date);

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}

export function JobHuntHeatmap() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchHeatmapData();
  }, [selectedYear]);

  const fetchHeatmapData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/analytics/heatmap?year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setData(data);
      }
    } catch (error) {
      console.error("Failed to fetch heatmap data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const weeks = useMemo(() => getWeeksArray(selectedYear), [selectedYear]);

  const dataByDate = useMemo(() => {
    if (!data?.days) return {};
    return data.days.reduce((acc, day) => {
      acc[day.date] = day;
      return acc;
    }, {} as Record<string, DayData>);
  }, [data?.days]);

  const getMonthLabels = () => {
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0];
      const month = firstDayOfWeek.getMonth();

      if (month !== lastMonth && firstDayOfWeek.getFullYear() === selectedYear) {
        labels.push({ month: MONTHS[month], weekIndex });
        lastMonth = month;
      }
    });

    return labels;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Job Hunt Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const monthLabels = getMonthLabels();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Job Hunt Activity
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedYear((y) => y - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium">{selectedYear}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedYear((y) => y + 1)}
              disabled={selectedYear >= new Date().getFullYear()}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-primary">
              {data?.totalApplications || 0}
            </p>
            <p className="text-xs text-muted-foreground">Applications</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-yellow-600">
              {data?.totalInterviews || 0}
            </p>
            <p className="text-xs text-muted-foreground">Interviews</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-green-600">
              {data?.totalOffers || 0}
            </p>
            <p className="text-xs text-muted-foreground">Offers</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">
              {((data?.successRate || 0) * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </div>
        </div>

        {/* Heatmap */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Month labels */}
            <div className="flex mb-2 ml-8">
              {monthLabels.map(({ month, weekIndex }, i) => (
                <div
                  key={i}
                  className="text-xs text-muted-foreground"
                  style={{
                    marginLeft: i === 0 ? weekIndex * 14 : undefined,
                    width: i < monthLabels.length - 1
                      ? (monthLabels[i + 1].weekIndex - weekIndex) * 14
                      : undefined,
                  }}
                >
                  {month}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="flex">
              {/* Day labels */}
              <div className="flex flex-col gap-0.5 mr-2 text-xs text-muted-foreground">
                {DAYS.map((day, i) => (
                  <div
                    key={day}
                    className="h-3 flex items-center"
                    style={{ visibility: i % 2 === 1 ? "visible" : "hidden" }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <TooltipProvider delayDuration={100}>
                <div className="flex gap-0.5">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-0.5">
                      {week.map((date, dayIndex) => {
                        const dateStr = date.toISOString().split("T")[0];
                        const dayData = dataByDate[dateStr];
                        const count = dayData?.applications || 0;
                        const isCurrentYear = date.getFullYear() === selectedYear;
                        const isFuture = date > new Date();

                        return (
                          <Tooltip key={dayIndex}>
                            <TooltipTrigger asChild>
                              <motion.div
                                className={cn(
                                  "w-3 h-3 rounded-sm cursor-pointer transition-colors",
                                  isCurrentYear && !isFuture
                                    ? getIntensityColor(count)
                                    : "bg-transparent",
                                  isCurrentYear && !isFuture && "hover:ring-2 hover:ring-primary/50"
                                )}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{
                                  delay: (weekIndex * 7 + dayIndex) * 0.001,
                                }}
                              />
                            </TooltipTrigger>
                            {isCurrentYear && !isFuture && (
                              <TooltipContent side="top" className="text-xs">
                                <p className="font-semibold">
                                  {date.toLocaleDateString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </p>
                                {dayData ? (
                                  <div className="mt-1 space-y-0.5">
                                    <p>{dayData.applications} application(s)</p>
                                    {dayData.interviews > 0 && (
                                      <p>{dayData.interviews} interview(s)</p>
                                    )}
                                    {dayData.offers > 0 && (
                                      <p>{dayData.offers} offer(s)</p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground">
                                    No activity
                                  </p>
                                )}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </TooltipProvider>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-0.5">
                {[0, 1, 2, 3, 5].map((count) => (
                  <div
                    key={count}
                    className={cn("w-3 h-3 rounded-sm", getIntensityColor(count))}
                  />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
        </div>

        {/* Insights */}
        {data && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Best Day</p>
                <p className="text-xs text-muted-foreground">
                  {data.bestDay || "N/A"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <TrendingUp className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Current Streak</p>
                <p className="text-xs text-muted-foreground">
                  {data.currentStreak} day(s)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Target className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Longest Streak</p>
                <p className="text-xs text-muted-foreground">
                  {data.longestStreak} day(s)
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for dashboard
export function JobHuntHeatmapCompact() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/analytics/heatmap?year=${new Date().getFullYear()}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // Ignore
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return <div className="h-24 animate-pulse bg-muted rounded" />;
  }

  // Show last 12 weeks
  const weeks = getWeeksArray(new Date().getFullYear()).slice(-12);

  const dataByDate = useMemo(() => {
    if (!data?.days) return {};
    return data.days.reduce((acc, day) => {
      acc[day.date] = day;
      return acc;
    }, {} as Record<string, DayData>);
  }, [data?.days]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Recent Activity
        </h3>
        <Badge variant="secondary" className="text-xs">
          {data?.totalApplications || 0} apps this year
        </Badge>
      </div>

      <TooltipProvider delayDuration={100}>
        <div className="flex gap-0.5">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-0.5">
              {week.map((date, dayIndex) => {
                const dateStr = date.toISOString().split("T")[0];
                const dayData = dataByDate[dateStr];
                const count = dayData?.applications || 0;
                const isFuture = date > new Date();

                return (
                  <Tooltip key={dayIndex}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-sm",
                          !isFuture ? getIntensityColor(count) : "bg-transparent"
                        )}
                      />
                    </TooltipTrigger>
                    {!isFuture && (
                      <TooltipContent side="top" className="text-xs">
                        <p>
                          {date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                          : {count} app(s)
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
