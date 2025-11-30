"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Star,
  Video,
  Loader2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EVENT_TYPES } from "@/lib/constants";

interface Event {
  id: string;
  title: string;
  description: string;
  type: string;
  startTime: string;
  endTime: string | null;
  timezone: string;
  isVirtual: boolean;
  location: string | null;
  meetingUrl: string | null;
  maxAttendees: number | null;
  xpReward: number;
  imageUrl: string | null;
  _count: {
    registrations: number;
  };
  isRegistered?: boolean;
  spotsLeft?: number | null;
}

export default function EventsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        }
      } catch {
        toast.error("Failed to load events");
      } finally {
        setIsLoading(false);
      }
    }

    fetchEvents();
  }, []);

  const handleRegister = async (eventId: string) => {
    if (!session) {
      router.push("/login?callbackUrl=/events");
      return;
    }

    setRegisteringId(eventId);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to register");
      }

      toast.success(data.message);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                isRegistered: true,
                _count: { registrations: e._count.registrations + 1 },
                spotsLeft: e.spotsLeft !== null ? e.spotsLeft - 1 : null,
              }
            : e
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to register");
    } finally {
      setRegisteringId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (startStr: string, endStr: string | null) => {
    const start = new Date(startStr);
    const startTime = start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    if (endStr) {
      const end = new Date(endStr);
      const endTime = end.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      return `${startTime} - ${endTime}`;
    }

    return startTime;
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "workshop":
        return "🎓";
      case "qa":
        return "❓";
      case "game_night":
        return "🎮";
      case "networking":
        return "🤝";
      default:
        return "📅";
    }
  };

  const groupEventsByMonth = (events: Event[]) => {
    return events.reduce((acc, event) => {
      const month = new Date(event.startTime).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(event);
      return acc;
    }, {} as Record<string, Event[]>);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const eventsByType = {
    all: events,
    workshop: events.filter((e) => e.type === "workshop"),
    qa: events.filter((e) => e.type === "qa"),
    game_night: events.filter((e) => e.type === "game_night"),
    networking: events.filter((e) => e.type === "networking"),
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Events</h1>
        <p className="text-muted-foreground">
          Join workshops, Q&As, and networking events to earn XP and boost your career!
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">
            All Events ({eventsByType.all.length})
          </TabsTrigger>
          {EVENT_TYPES.map((type) => (
            <TabsTrigger key={type.value} value={type.value}>
              {type.label} ({eventsByType[type.value as keyof typeof eventsByType]?.length || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(eventsByType).map(([key, typeEvents]) => (
          <TabsContent key={key} value={key}>
            {typeEvents.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Calendar className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No upcoming events</h3>
                  <p className="text-muted-foreground">
                    Check back later for new events!
                  </p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(groupEventsByMonth(typeEvents)).map(([month, monthEvents]) => (
                <div key={month} className="mb-8">
                  <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                    {month}
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {monthEvents.map((event) => {
                      const isFull =
                        event.maxAttendees !== null && event.spotsLeft !== undefined && event.spotsLeft <= 0;

                      return (
                        <Card
                          key={event.id}
                          className={`overflow-hidden transition-all ${
                            event.isRegistered
                              ? "border-green-300 bg-green-50/50"
                              : "hover:border-violet-300"
                          }`}
                        >
                          {event.imageUrl && (
                            <div className="h-32 overflow-hidden">
                              <img
                                src={event.imageUrl}
                                alt={event.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <span className="text-2xl">
                                {getEventTypeIcon(event.type)}
                              </span>
                              <Badge
                                variant="outline"
                                className="bg-violet-50 text-violet-600 border-violet-200"
                              >
                                <Star className="w-3 h-3 mr-1" />+{event.xpReward} XP
                              </Badge>
                            </div>

                            <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                              {event.description}
                            </p>

                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                {formatDate(event.startTime)}
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                {formatTime(event.startTime, event.endTime)}
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                {event.isVirtual ? (
                                  <>
                                    <Video className="w-4 h-4" />
                                    <span>Virtual Event</span>
                                  </>
                                ) : (
                                  <>
                                    <MapPin className="w-4 h-4" />
                                    <span>{event.location || "TBA"}</span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Users className="w-4 h-4" />
                                <span>
                                  {event._count.registrations} registered
                                  {event.maxAttendees && (
                                    <> / {event.maxAttendees} spots</>
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="mt-6">
                              {event.isRegistered ? (
                                <div className="space-y-2">
                                  <Button
                                    variant="outline"
                                    className="w-full border-green-500 text-green-600"
                                    disabled
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Registered
                                  </Button>
                                  {event.isVirtual && event.meetingUrl && (
                                    <Button
                                      variant="outline"
                                      className="w-full"
                                      asChild
                                    >
                                      <a
                                        href={event.meetingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Join Meeting
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              ) : isFull ? (
                                <Button variant="outline" className="w-full" disabled>
                                  Event Full
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleRegister(event.id)}
                                  disabled={registeringId === event.id}
                                  className="w-full bg-violet-500 hover:bg-violet-600"
                                >
                                  {registeringId === event.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  ) : (
                                    <Calendar className="w-4 h-4 mr-2" />
                                  )}
                                  Register Now
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
