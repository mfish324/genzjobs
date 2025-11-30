import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import {
  Briefcase,
  Target,
  Trophy,
  Star,
  ArrowRight,
  TrendingUp,
  Calendar,
  CheckCircle2,
} from "lucide-react";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { levelProgress, xpToNextLevel, calculateLevel } from "@/lib/constants";

async function getDashboardData(userId: string) {
  const [user, applications, activeQuests, recentActivity] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        xp: true,
        level: true,
        skills: true,
        experience: true,
      },
    }),
    prisma.application.findMany({
      where: { userId },
      include: { jobListing: true },
      orderBy: { appliedAt: "desc" },
      take: 5,
    }),
    prisma.userQuest.findMany({
      where: { userId, isCompleted: false },
      include: { quest: true },
      take: 3,
    }),
    prisma.xpTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const applicationStats = await prisma.application.groupBy({
    by: ["status"],
    where: { userId },
    _count: true,
  });

  return { user, applications, activeQuests, recentActivity, applicationStats };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { user, applications, activeQuests, recentActivity, applicationStats } =
    await getDashboardData(session.user.id);

  if (!user) {
    redirect("/login");
  }

  const totalApplications = applicationStats.reduce((acc, s) => acc + s._count, 0);
  const interviewingCount = applicationStats.find((s) => s.status === "interviewing")?._count || 0;
  const offeredCount = applicationStats.find((s) => s.status === "offered")?._count || 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user.name?.split(" ")[0]}!</h1>
        <p className="text-muted-foreground">Here&apos;s your career progress at a glance.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Level Card */}
        <Card className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Trophy className="w-8 h-8" />
              <Badge className="bg-white/20 text-white hover:bg-white/30">
                Level {user.level}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{user.xp} XP</span>
                <span>{xpToNextLevel(user.xp)} to next level</span>
              </div>
              <Progress value={levelProgress(user.xp)} className="bg-white/20" />
            </div>
          </CardContent>
        </Card>

        {/* Applications Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-blue-500" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{totalApplications}</p>
            <p className="text-sm text-muted-foreground">Total Applications</p>
          </CardContent>
        </Card>

        {/* Interviewing Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">{interviewingCount}</p>
            <p className="text-sm text-muted-foreground">Interviewing</p>
          </CardContent>
        </Card>

        {/* Offers Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">{offeredCount}</p>
            <p className="text-sm text-muted-foreground">Offers Received</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Active Quests */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-violet-500" />
                Active Quests
              </CardTitle>
              <CardDescription>Complete quests to earn XP</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/quests">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activeQuests.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">No active quests</p>
                <Button asChild>
                  <Link href="/quests">Browse Quests</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeQuests.map((uq) => (
                  <div
                    key={uq.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={
                            uq.quest.type === "daily"
                              ? "border-blue-500 text-blue-500"
                              : uq.quest.type === "weekly"
                              ? "border-purple-500 text-purple-500"
                              : "border-yellow-500 text-yellow-500"
                          }
                        >
                          {uq.quest.type}
                        </Badge>
                        <span className="font-medium">{uq.quest.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{uq.quest.description}</p>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>
                            {uq.progress} / {uq.quest.targetCount}
                          </span>
                          <span className="text-violet-600 font-medium">
                            +{uq.quest.xpReward} XP
                          </span>
                        </div>
                        <Progress
                          value={(uq.progress / uq.quest.targetCount) * 100}
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent XP Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your XP earnings</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Star className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        activity.amount > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {activity.amount > 0 ? "+" : ""}
                      {activity.amount} XP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Applications */}
      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>Track your job applications</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/applications">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">No applications yet</p>
              <Button asChild>
                <Link href="/jobs">Browse Jobs</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{app.jobListing.title}</p>
                    <p className="text-sm text-muted-foreground">{app.jobListing.company}</p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="outline"
                      className={
                        app.status === "applied"
                          ? "border-blue-500 text-blue-500"
                          : app.status === "interviewing"
                          ? "border-yellow-500 text-yellow-500"
                          : app.status === "offered"
                          ? "border-green-500 text-green-500"
                          : "border-red-500 text-red-500"
                      }
                    >
                      {app.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
