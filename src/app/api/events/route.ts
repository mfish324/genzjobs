import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();

    const events = await prisma.event.findMany({
      where: {
        isActive: true,
        startTime: { gte: now },
      },
      include: {
        _count: {
          select: { registrations: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    // Check if current user is registered for each event
    const session = await getServerSession(authOptions);
    let eventsWithRegistration = events;

    if (session?.user?.id) {
      const registrations = await prisma.eventRegistration.findMany({
        where: {
          userId: session.user.id,
          eventId: { in: events.map((e) => e.id) },
        },
        select: { eventId: true },
      });

      const registeredEventIds = new Set(registrations.map((r) => r.eventId));

      eventsWithRegistration = events.map((event) => ({
        ...event,
        isRegistered: registeredEventIds.has(event.id),
        spotsLeft: event.maxAttendees
          ? event.maxAttendees - event._count.registrations
          : null,
      }));
    }

    return NextResponse.json(eventsWithRegistration);
  } catch (error) {
    console.error("Events fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

const registerSchema = z.object({
  eventId: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { eventId } = registerSchema.parse(body);

    // Get event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: { registrations: true },
        },
      },
    });

    if (!event || !event.isActive) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check capacity
    if (event.maxAttendees && event._count.registrations >= event.maxAttendees) {
      return NextResponse.json({ error: "Event is full" }, { status: 400 });
    }

    // Check if already registered
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: session.user.id,
        },
      },
    });

    if (existingRegistration) {
      return NextResponse.json({ error: "Already registered for this event" }, { status: 400 });
    }

    // Create registration
    const registration = await prisma.eventRegistration.create({
      data: {
        eventId,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      registration,
      message: "Successfully registered for event!",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }

    console.error("Event registration error:", error);
    return NextResponse.json({ error: "Failed to register for event" }, { status: 500 });
  }
}
