"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Users,
  Clock,
  Play,
  Calendar,
  MessageSquare,
  Sparkles,
  Plus,
  LogIn,
  LogOut,
  CheckCircle,
  Zap,
  Timer,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { XP_REWARDS } from "@/lib/constants";

interface Participant {
  id: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    level?: number;
  };
}

interface JamSession {
  id: string;
  title: string;
  description: string | null;
  topic: string;
  hostId: string;
  host: {
    id: string;
    name: string | null;
    image: string | null;
  };
  maxParticipants: number;
  startTime: string;
  endTime: string;
  status: "scheduled" | "active" | "completed";
  participants: Participant[];
  isParticipating: boolean;
  participantCount: number;
}

const JAM_TOPICS = [
  "Resume Review",
  "Interview Prep",
  "Job Search Tips",
  "Networking",
  "Career Advice",
  "Salary Negotiation",
  "Industry Insights",
  "Open Discussion",
];

export function JamSessionList() {
  const { data: session } = useSession();
  const [jamSessions, setJamSessions] = useState<JamSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    fetchJamSessions();
  }, []);

  const fetchJamSessions = async () => {
    try {
      const res = await fetch("/api/jam-sessions");
      if (res.ok) {
        const data = await res.json();
        setJamSessions(data);
      }
    } catch (error) {
      console.error("Failed to fetch jam sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (jamId: string) => {
    if (!session) {
      toast.error("Please sign in to join");
      return;
    }

    try {
      const res = await fetch(`/api/jam-sessions/${jamId}`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Joined jam session!");
        fetchJamSessions();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to join");
      }
    } catch {
      toast.error("Failed to join jam session");
    }
  };

  const handleLeave = async (jamId: string) => {
    try {
      const res = await fetch(`/api/jam-sessions/${jamId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Left jam session");
        fetchJamSessions();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to leave");
      }
    } catch {
      toast.error("Failed to leave jam session");
    }
  };

  const handleComplete = async (jamId: string) => {
    try {
      const res = await fetch(`/api/jam-sessions/${jamId}`, {
        method: "PATCH",
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Jam session completed! ${data.participantsRewarded} participants earned ${data.xpAwarded} XP each`);
        fetchJamSessions();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to complete");
      }
    } catch {
      toast.error("Failed to complete jam session");
    }
  };

  const activeSessions = jamSessions.filter((js) => js.status === "active");
  const upcomingSessions = jamSessions.filter((js) => js.status === "scheduled");

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Job Jam Sessions
          </h2>
          <p className="text-sm text-muted-foreground">
            Join group discussions and earn XP together
          </p>
        </div>
        {session && (
          <CreateJamDialog
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            onCreated={fetchJamSessions}
          />
        )}
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live Now ({activeSessions.length})
          </h3>
          {activeSessions.map((jam) => (
            <JamSessionCard
              key={jam.id}
              jam={jam}
              currentUserId={session?.user?.id}
              onJoin={handleJoin}
              onLeave={handleLeave}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            Upcoming ({upcomingSessions.length})
          </h3>
          {upcomingSessions.map((jam) => (
            <JamSessionCard
              key={jam.id}
              jam={jam}
              currentUserId={session?.user?.id}
              onJoin={handleJoin}
              onLeave={handleLeave}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {jamSessions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No active jam sessions</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Be the first to start a job jam and earn XP with others!
            </p>
            {session && (
              <CreateJamDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onCreated={fetchJamSessions}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function JamSessionCard({
  jam,
  currentUserId,
  onJoin,
  onLeave,
  onComplete,
}: {
  jam: JamSession;
  currentUserId?: string;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  const isHost = currentUserId === jam.hostId;
  const isActive = jam.status === "active";
  const isFull = jam.participantCount >= jam.maxParticipants;

  const startTime = new Date(jam.startTime);
  const endTime = new Date(jam.endTime);
  const now = new Date();

  const timeRemaining = isActive
    ? Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000 / 60))
    : null;

  const progress = isActive
    ? Math.min(
        100,
        ((now.getTime() - startTime.getTime()) /
          (endTime.getTime() - startTime.getTime())) *
          100
      )
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <Card
        className={cn(
          "overflow-hidden transition-shadow",
          isActive && "border-green-500/50 shadow-green-500/10 shadow-lg"
        )}
      >
        {/* Active indicator bar */}
        {isActive && (
          <div className="absolute top-0 left-0 right-0 h-1">
            <Progress value={progress} className="h-1 rounded-none" />
          </div>
        )}

        <CardContent className="p-4 pt-5">
          <div className="flex gap-4">
            {/* Topic Icon */}
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                isActive
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-primary/10"
              )}
            >
              <MessageSquare
                className={cn(
                  "w-6 h-6",
                  isActive ? "text-green-600 dark:text-green-400" : "text-primary"
                )}
              />
            </div>

            <div className="flex-1 min-w-0">
              {/* Title and badges */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold line-clamp-1">{jam.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {jam.topic}
                    </Badge>
                    {isActive && (
                      <Badge className="bg-green-500 text-white text-xs">
                        <Play className="w-3 h-3 mr-1" />
                        Live
                      </Badge>
                    )}
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="shrink-0 bg-primary/10 text-primary"
                >
                  <Sparkles className="w-3 h-3 mr-1" />+{XP_REWARDS.JAM_SESSION} XP
                </Badge>
              </div>

              {/* Description */}
              {jam.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {jam.description}
                </p>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                {/* Host */}
                <div className="flex items-center gap-1">
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={jam.host.image || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {jam.host.name?.charAt(0) || "H"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[80px]">
                    {jam.host.name || "Host"}
                  </span>
                </div>

                {/* Participants */}
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {jam.participantCount}/{jam.maxParticipants}
                  </span>
                </div>

                {/* Time */}
                {isActive && timeRemaining !== null ? (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <Timer className="w-3.5 h-3.5" />
                    <span>{timeRemaining}m left</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {startTime.toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Participants preview */}
              {jam.participants.length > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex -space-x-2">
                    {jam.participants.slice(0, 5).map((p) => (
                      <Avatar
                        key={p.id}
                        className="w-6 h-6 border-2 border-background"
                      >
                        <AvatarImage src={p.user.image || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {p.user.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {jam.participants.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{jam.participants.length - 5} more
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4">
                {isHost ? (
                  <>
                    {isActive && (
                      <Button
                        size="sm"
                        onClick={() => onComplete(jam.id)}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        End & Award XP
                      </Button>
                    )}
                    <Badge variant="secondary" className="ml-auto">
                      <User className="w-3 h-3 mr-1" />
                      Host
                    </Badge>
                  </>
                ) : jam.isParticipating ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onLeave(jam.id)}
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    Leave
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => onJoin(jam.id)}
                    disabled={isFull}
                    className={cn(
                      isActive && "bg-green-500 hover:bg-green-600"
                    )}
                  >
                    <LogIn className="w-4 h-4 mr-1" />
                    {isFull ? "Full" : isActive ? "Join Now" : "Join"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CreateJamDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    topic: JAM_TOPICS[0],
    maxParticipants: "10",
    durationMinutes: "30",
  });

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/jam-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          topic: formData.topic,
          maxParticipants: parseInt(formData.maxParticipants),
          durationMinutes: parseInt(formData.durationMinutes),
        }),
      });

      if (res.ok) {
        toast.success("Jam session created! It's now live.");
        onOpenChange(false);
        onCreated();
        setFormData({
          title: "",
          description: "",
          topic: JAM_TOPICS[0],
          maxParticipants: "10",
          durationMinutes: "30",
        });
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create jam session");
      }
    } catch {
      toast.error("Failed to create jam session");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gradient-bg">
          <Plus className="w-4 h-4 mr-1" />
          Start Jam
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a Job Jam Session</DialogTitle>
          <DialogDescription>
            Create a group discussion session and earn XP with others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Session Title</Label>
            <Input
              id="title"
              placeholder="e.g., Resume Review Circle"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Select
              value={formData.topic}
              onValueChange={(value) =>
                setFormData({ ...formData, topic: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a topic" />
              </SelectTrigger>
              <SelectContent>
                {JAM_TOPICS.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What will you discuss?"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Participants</Label>
              <Select
                value={formData.maxParticipants}
                onValueChange={(value) =>
                  setFormData({ ...formData, maxParticipants: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} people
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={formData.durationMinutes}
                onValueChange={(value) =>
                  setFormData({ ...formData, durationMinutes: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !formData.title.trim()}
            className="gradient-bg"
          >
            {isCreating ? "Creating..." : "Start Jam Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
