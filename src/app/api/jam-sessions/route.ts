import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get active and upcoming jam sessions
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "10");

  try {
    const now = new Date();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};

    if (status === "active") {
      whereClause.status = "active";
    } else if (status === "upcoming") {
      whereClause.status = "scheduled";
      whereClause.startTime = { gt: now };
    } else if (status === "completed") {
      whereClause.status = "completed";
    } else {
      // Default: show active and upcoming
      whereClause.OR = [
        { status: "active" },
        { status: "scheduled", startTime: { gt: now } },
      ];
    }

    const jamSessions = await prisma.jamSession.findMany({
      where: whereClause,
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: { participants: true },
        },
      },
      orderBy: { startTime: "asc" },
      take: limit,
    });

    // Get host user info separately and add user participation status
    const sessionsWithHost = await Promise.all(
      jamSessions.map(async (js) => {
        const host = await prisma.user.findUnique({
          where: { id: js.hostUserId },
          select: { id: true, name: true, image: true },
        });

        // Calculate end time from startTime + duration
        const endTime = new Date(js.startTime.getTime() + js.duration * 60 * 1000);

        return {
          ...js,
          host,
          hostId: js.hostUserId, // Map for frontend
          topic: js.type, // Map type to topic for frontend
          endTime: endTime.toISOString(),
          isParticipating: session?.user?.id
            ? js.participants.some((p) => p.user.id === session.user!.id)
            : false,
          participantCount: js._count.participants,
        };
      })
    );

    return NextResponse.json(sessionsWithHost);
  } catch (error) {
    console.error("Jam sessions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch jam sessions" },
      { status: 500 }
    );
  }
}

const createJamSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  topic: z.string().min(2).max(50),
  maxParticipants: z.number().min(2).max(20).default(10),
  durationMinutes: z.number().min(15).max(60).default(30),
  startTime: z.string().datetime().optional(), // If not provided, starts immediately
});

// Create a new jam session
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createJamSchema.parse(body);

    const now = new Date();
    const startTime = data.startTime ? new Date(data.startTime) : now;

    // Determine initial status
    const status = startTime <= now ? "active" : "scheduled";

    // Create a chat room ID (placeholder - could integrate with actual chat)
    const chatRoomId = `jam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const jamSession = await prisma.jamSession.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.topic, // Use type field for topic
        chatRoomId,
        hostUserId: session.user.id,
        maxParticipants: data.maxParticipants,
        duration: data.durationMinutes,
        startTime,
        status,
      },
    });

    // Auto-join the host as participant
    await prisma.jamParticipant.create({
      data: {
        userId: session.user.id,
        jamSessionId: jamSession.id,
      },
    });

    // Get host info for response
    const host = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, image: true },
    });

    // Calculate end time
    const endTime = new Date(startTime.getTime() + data.durationMinutes * 60 * 1000);

    return NextResponse.json({
      ...jamSession,
      host,
      hostId: jamSession.hostUserId,
      topic: jamSession.type,
      endTime: endTime.toISOString(),
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Create jam session error:", error);
    return NextResponse.json(
      { error: "Failed to create jam session" },
      { status: 500 }
    );
  }
}
