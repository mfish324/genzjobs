import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const roomId = searchParams.get("roomId");
  const cursor = searchParams.get("cursor");
  const limit = parseInt(searchParams.get("limit") || "50");

  if (!roomId) {
    return NextResponse.json({ error: "Room ID required" }, { status: 400 });
  }

  try {
    const messages = await prisma.chatMessage.findMany({
      where: {
        chatRoomId: roomId,
        isDeleted: false,
      },
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
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    return NextResponse.json({
      messages: messages.reverse(),
      nextCursor: messages.length === limit ? messages[0]?.id : null,
    });
  } catch (error) {
    console.error("Messages fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

const messageSchema = z.object({
  roomId: z.string(),
  content: z.string().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { roomId, content } = messageSchema.parse(body);

    // Check if room exists
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room || !room.isActive) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const message = await prisma.chatMessage.create({
      data: {
        chatRoomId: roomId,
        userId: session.user.id,
        content,
      },
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
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }

    console.error("Message create error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
