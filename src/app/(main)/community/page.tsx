"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Loader2,
  Hash,
  Users,
  Smile,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ChatRoom {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  icon: string | null;
  _count: {
    messages: number;
  };
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    level: number;
  };
}

export default function CommunityPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  // Fetch rooms
  useEffect(() => {
    async function fetchRooms() {
      try {
        const res = await fetch("/api/community/rooms");
        if (res.ok) {
          const data = await res.json();
          setRooms(data);
          if (data.length > 0 && !selectedRoom) {
            setSelectedRoom(data[0]);
          }
        }
      } catch {
        toast.error("Failed to load chat rooms");
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user) {
      fetchRooms();
    }
  }, [session, selectedRoom]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!selectedRoom) return;

    try {
      const res = await fetch(`/api/community/messages?roomId=${selectedRoom.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch {
      console.error("Failed to fetch messages");
    }
  }, [selectedRoom]);

  // Initial message fetch and polling
  useEffect(() => {
    if (selectedRoom) {
      setIsLoadingMessages(true);
      fetchMessages().finally(() => setIsLoadingMessages(false));

      // Poll for new messages every 5 seconds
      pollIntervalRef.current = setInterval(fetchMessages, 5000);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [selectedRoom, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || isSending) return;

    setIsSending(true);
    const messageContent = newMessage;
    setNewMessage("");

    try {
      const res = await fetch("/api/community/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          content: messageContent,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      const message = await res.json();
      setMessages((prev) => [...prev, message]);
    } catch {
      toast.error("Failed to send message");
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString();
  };

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Community</h1>
        <p className="text-muted-foreground">
          Connect with other job seekers and share your experiences
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6 h-[calc(100vh-250px)]">
        {/* Rooms Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Channels
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-1">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                    selectedRoom?.id === room.id
                      ? "bg-violet-100 text-violet-700"
                      : "hover:bg-muted"
                  )}
                >
                  <span className="text-lg">{room.icon || "💬"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{room.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {room.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-3 flex flex-col">
          {selectedRoom ? (
            <>
              <CardHeader className="border-b py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selectedRoom.icon || "💬"}</span>
                    <div>
                      <CardTitle className="text-lg">{selectedRoom.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedRoom.description}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    <Users className="w-3 h-3 mr-1" />
                    Online
                  </Badge>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 p-4">
                {isLoadingMessages ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-10">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No messages yet</p>
                    <p className="text-sm text-muted-foreground">
                      Be the first to say hello!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, index) => {
                      const showDateDivider =
                        index === 0 ||
                        formatDate(messages[index - 1].createdAt) !==
                          formatDate(message.createdAt);
                      const isOwnMessage = message.user.id === session?.user?.id;

                      return (
                        <div key={message.id}>
                          {showDateDivider && (
                            <div className="flex items-center gap-4 my-6">
                              <div className="flex-1 h-px bg-border" />
                              <span className="text-xs text-muted-foreground font-medium">
                                {formatDate(message.createdAt)}
                              </span>
                              <div className="flex-1 h-px bg-border" />
                            </div>
                          )}

                          <div
                            className={cn(
                              "flex gap-3",
                              isOwnMessage && "flex-row-reverse"
                            )}
                          >
                            <Avatar className="w-8 h-8 shrink-0">
                              <AvatarImage src={message.user.image || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs">
                                {message.user.name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>

                            <div
                              className={cn(
                                "max-w-[70%]",
                                isOwnMessage && "text-right"
                              )}
                            >
                              <div
                                className={cn(
                                  "flex items-center gap-2 mb-1",
                                  isOwnMessage && "flex-row-reverse"
                                )}
                              >
                                <span className="text-sm font-medium">
                                  {message.user.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  Lv.{message.user.level}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(message.createdAt)}
                                </span>
                              </div>
                              <div
                                className={cn(
                                  "inline-block px-4 py-2 rounded-2xl",
                                  isOwnMessage
                                    ? "bg-violet-500 text-white rounded-br-sm"
                                    : "bg-muted rounded-bl-sm"
                                )}
                              >
                                <p className="text-sm whitespace-pre-wrap">
                                  {message.content}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    disabled={isSending}
                    maxLength={1000}
                  />
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className="bg-violet-500 hover:bg-violet-600"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Select a channel to start chatting</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
