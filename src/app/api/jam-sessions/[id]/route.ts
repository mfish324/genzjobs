import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { XP_REWARDS } from "@/lib/constants";

// Get single jam session details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  try {
    const jamSession = await prisma.jamSession.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                level: true,
              },
            },
          },
        },
        _count: {
          select: { participants: true },
        },
      },
    });

    if (!jamSession) {
      return NextResponse.json(
        { error: "Jam session not found" },
        { status: 404 }
      );
    }

    // Get host info
    const host = await prisma.user.findUnique({
      where: { id: jamSession.hostUserId },
      select: { id: true, name: true, image: true },
    });

    const isParticipating = session?.user?.id
      ? jamSession.participants.some((p) => p.user.id === session.user!.id)
      : false;

    // Calculate end time
    const endTime = new Date(jamSession.startTime.getTime() + jamSession.duration * 60 * 1000);

    return NextResponse.json({
      ...jamSession,
      host,
      hostId: jamSession.hostUserId,
      topic: jamSession.type,
      endTime: endTime.toISOString(),
      isParticipating,
      participantCount: jamSession._count.participants,
    });
  } catch (error) {
    console.error("Jam session fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch jam session" },
      { status: 500 }
    );
  }
}

// Join a jam session
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const jamSession = await prisma.jamSession.findUnique({
      where: { id },
      include: {
        _count: { select: { participants: true } },
      },
    });

    if (!jamSession) {
      return NextResponse.json(
        { error: "Jam session not found" },
        { status: 404 }
      );
    }

    // Check if session is still active/upcoming
    if (jamSession.status === "completed") {
      return NextResponse.json(
        { error: "This jam session has ended" },
        { status: 400 }
      );
    }

    // Check capacity
    if (jamSession._count.participants >= jamSession.maxParticipants) {
      return NextResponse.json(
        { error: "Jam session is full" },
        { status: 400 }
      );
    }

    // Check if already participating
    const existingParticipation = await prisma.jamParticipant.findFirst({
      where: {
        userId: session.user.id,
        jamSessionId: id,
      },
    });

    if (existingParticipation) {
      return NextResponse.json(
        { error: "Already participating in this jam session" },
        { status: 400 }
      );
    }

    // Join the session
    await prisma.jamParticipant.create({
      data: {
        userId: session.user.id,
        jamSessionId: id,
      },
    });

    return NextResponse.json({ success: true, message: "Joined jam session" });
  } catch (error) {
    console.error("Join jam session error:", error);
    return NextResponse.json(
      { error: "Failed to join jam session" },
      { status: 500 }
    );
  }
}

// Leave a jam session
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const jamSession = await prisma.jamSession.findUnique({
      where: { id },
    });

    if (!jamSession) {
      return NextResponse.json(
        { error: "Jam session not found" },
        { status: 404 }
      );
    }

    // Can't leave if you're the host
    if (jamSession.hostUserId === session.user.id) {
      return NextResponse.json(
        { error: "Host cannot leave the jam session" },
        { status: 400 }
      );
    }

    await prisma.jamParticipant.deleteMany({
      where: {
        userId: session.user.id,
        jamSessionId: id,
      },
    });

    return NextResponse.json({ success: true, message: "Left jam session" });
  } catch (error) {
    console.error("Leave jam session error:", error);
    return NextResponse.json(
      { error: "Failed to leave jam session" },
      { status: 500 }
    );
  }
}

// Complete a jam session (host only) - awards XP to participants
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const jamSession = await prisma.jamSession.findUnique({
      where: { id },
      include: {
        participants: true,
      },
    });

    if (!jamSession) {
      return NextResponse.json(
        { error: "Jam session not found" },
        { status: 404 }
      );
    }

    // Only host can complete
    if (jamSession.hostUserId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the host can complete the jam session" },
        { status: 403 }
      );
    }

    if (jamSession.status === "completed") {
      return NextResponse.json(
        { error: "Jam session already completed" },
        { status: 400 }
      );
    }

    // Complete the session and award XP to all participants
    const xpReward = jamSession.xpReward || XP_REWARDS.JAM_SESSION;

    await prisma.$transaction([
      // Update session status
      prisma.jamSession.update({
        where: { id },
        data: { status: "completed" },
      }),
      // Award XP to each participant
      ...jamSession.participants.map((participant) =>
        prisma.user.update({
          where: { id: participant.userId },
          data: {
            xp: { increment: xpReward },
          },
        })
      ),
      // Update participant records
      ...jamSession.participants.map((participant) =>
        prisma.jamParticipant.update({
          where: { id: participant.id },
          data: { xpEarned: xpReward },
        })
      ),
      // Create XP transactions
      ...jamSession.participants.map((participant) =>
        prisma.xpTransaction.create({
          data: {
            userId: participant.userId,
            amount: xpReward,
            type: "jam_session",
            description: `Participated in jam session: ${jamSession.title}`,
            referenceType: "jam_session",
            referenceId: id,
          },
        })
      ),
    ]);

    return NextResponse.json({
      success: true,
      message: "Jam session completed",
      participantsRewarded: jamSession.participants.length,
      xpAwarded: xpReward,
    });
  } catch (error) {
    console.error("Complete jam session error:", error);
    return NextResponse.json(
      { error: "Failed to complete jam session" },
      { status: 500 }
    );
  }
}
