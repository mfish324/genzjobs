import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

  try {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Get all applications for the year
    const applications = await prisma.application.findMany({
      where: {
        userId: session.user.id,
        appliedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        appliedAt: true,
        status: true,
      },
    });

    // Group by date
    const dayMap = new Map<string, { applications: number; interviews: number; offers: number }>();

    applications.forEach((app) => {
      const dateStr = app.appliedAt.toISOString().split("T")[0];
      const existing = dayMap.get(dateStr) || { applications: 0, interviews: 0, offers: 0 };

      existing.applications++;
      if (app.status === "interviewing") existing.interviews++;
      if (app.status === "offered") existing.offers++;

      dayMap.set(dateStr, existing);
    });

    // Convert to array
    const days = Array.from(dayMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));

    // Calculate stats
    const totalApplications = applications.length;
    const totalInterviews = applications.filter((a) => a.status === "interviewing").length;
    const totalOffers = applications.filter((a) => a.status === "offered").length;
    const successRate = totalApplications > 0 ? totalInterviews / totalApplications : 0;

    // Find best day (day of week with most applications)
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
    applications.forEach((app) => {
      dayOfWeekCounts[app.appliedAt.getDay()]++;
    });
    const bestDayIndex = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
    const bestDay = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][bestDayIndex];

    // Get streak info from user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        currentStreak: true,
        longestStreak: true,
      },
    });

    return NextResponse.json({
      days,
      totalApplications,
      totalInterviews,
      totalOffers,
      successRate,
      bestDay: totalApplications > 0 ? bestDay : null,
      currentStreak: user?.currentStreak || 0,
      longestStreak: user?.longestStreak || 0,
    });
  } catch (error) {
    console.error("Heatmap data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch heatmap data" },
      { status: 500 }
    );
  }
}
