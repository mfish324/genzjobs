"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Target,
  Star,
  Trophy,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Zap,
  Flame,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Quest {
  id: string;
  title: string;
  description: string;
  type: string;
  action: string;
  targetCount: number;
  xpReward: number;
  progress: number;
  isCompleted: boolean;
  completedAt: string | null;
}

interface QuestData {
  quests: {
    daily: Quest[];
    weekly: Quest[];
    milestone: Quest[];
  };
  stats: {
    totalQuests: number;
    completedToday: number;
    completedThisWeek: number;
    totalMilestonesCompleted: number;
    dailyProgress: number;
  };
}

export default function QuestsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [data, setData] = useState<QuestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  useEffect(() => {
    async function fetchQuests() {
      try {
        const res = await fetch("/api/quests");
        if (res.ok) {
          const questData = await res.json();
          setData(questData);
        }
      } catch {
        toast.error("Failed to load quests");
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user) {
      fetchQuests();
    }
  }, [session]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "apply_jobs":
        return "📝";
      case "complete_profile":
        return "👤";
      case "attend_event":
        return "🎉";
      case "login":
        return "🔑";
      case "update_skills":
        return "💪";
      case "view_resources":
        return "📚";
      default:
        return "✨";
    }
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

  const { quests, stats } = data;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Quests</h1>
        <p className="text-muted-foreground">
          Complete quests to earn XP and level up your career!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
              <Flame className="w-6 h-6 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.dailyProgress}%</p>
              <p className="text-sm text-muted-foreground">Daily Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completedToday}</p>
              <p className="text-sm text-muted-foreground">Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completedThisWeek}</p>
              <p className="text-sm text-muted-foreground">This Week</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalMilestonesCompleted}</p>
              <p className="text-sm opacity-90">Milestones</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quest Tabs */}
      <Tabs defaultValue="daily" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Daily
            {quests.daily.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {quests.daily.filter((q) => !q.isCompleted).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Weekly
            {quests.weekly.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {quests.weekly.filter((q) => !q.isCompleted).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="milestone" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Milestones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <QuestList quests={quests.daily} type="daily" getActionIcon={getActionIcon} />
        </TabsContent>

        <TabsContent value="weekly">
          <QuestList quests={quests.weekly} type="weekly" getActionIcon={getActionIcon} />
        </TabsContent>

        <TabsContent value="milestone">
          <QuestList quests={quests.milestone} type="milestone" getActionIcon={getActionIcon} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuestList({
  quests,
  type,
  getActionIcon,
}: {
  quests: Quest[];
  type: string;
  getActionIcon: (action: string) => string;
}) {
  if (quests.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Target className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No {type} quests available</h3>
          <p className="text-muted-foreground">Check back later for new challenges!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {quests.map((quest) => (
        <Card
          key={quest.id}
          className={`transition-all ${
            quest.isCompleted
              ? "bg-green-50 border-green-200"
              : "hover:border-violet-300"
          }`}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                  quest.isCompleted ? "bg-green-100" : "bg-violet-100"
                }`}
              >
                {quest.isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  getActionIcon(quest.action)
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{quest.title}</h3>
                    <p className="text-sm text-muted-foreground">{quest.description}</p>
                  </div>
                  <Badge
                    variant={quest.isCompleted ? "default" : "outline"}
                    className={`shrink-0 ${
                      quest.isCompleted
                        ? "bg-green-500"
                        : "border-violet-500 text-violet-500"
                    }`}
                  >
                    <Star className="w-3 h-3 mr-1" />+{quest.xpReward} XP
                  </Badge>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>
                      {quest.progress} / {quest.targetCount} completed
                    </span>
                    <span className="text-muted-foreground">
                      {Math.round((quest.progress / quest.targetCount) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={(quest.progress / quest.targetCount) * 100}
                    className={`h-2 ${quest.isCompleted ? "bg-green-100" : ""}`}
                  />
                </div>

                {quest.isCompleted && quest.completedAt && (
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Completed {new Date(quest.completedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
