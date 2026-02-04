"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { Gift, Sparkles, Loader2, Star, Zap, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface SpinResult {
  xpAmount: number;
  segment: number;
  nextSpinAt: string;
}

interface SpinStatus {
  canSpin: boolean;
  nextSpinAt: string | null;
  lastXpWon: number | null;
}

const WHEEL_SEGMENTS = [
  { xp: 10, color: "from-blue-400 to-blue-600", label: "10 XP" },
  { xp: 25, color: "from-green-400 to-green-600", label: "25 XP" },
  { xp: 50, color: "from-purple-400 to-purple-600", label: "50 XP" },
  { xp: 15, color: "from-amber-400 to-amber-600", label: "15 XP" },
  { xp: 100, color: "from-pink-400 to-pink-600", label: "100 XP", rare: true },
  { xp: 20, color: "from-cyan-400 to-cyan-600", label: "20 XP" },
  { xp: 35, color: "from-indigo-400 to-indigo-600", label: "35 XP" },
  { xp: 200, color: "from-yellow-400 to-orange-500", label: "200 XP", rare: true },
];

const SEGMENT_ANGLE = 360 / WHEEL_SEGMENTS.length;

export function DailySpinWheel() {
  const [status, setStatus] = useState<SpinStatus | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const controls = useAnimation();
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSpinStatus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (status?.nextSpinAt) {
      const updateCountdown = () => {
        const now = new Date();
        const nextSpin = new Date(status.nextSpinAt!);
        const diff = nextSpin.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeLeft("");
          fetchSpinStatus();
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [status?.nextSpinAt]);

  const fetchSpinStatus = async () => {
    try {
      const res = await fetch("/api/daily-spin");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch spin status:", error);
    }
  };

  const handleSpin = async () => {
    if (isSpinning || !status?.canSpin) return;

    setIsSpinning(true);
    setResult(null);

    try {
      const res = await fetch("/api/daily-spin", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to spin");
        setIsSpinning(false);
        return;
      }

      // Calculate rotation to land on the won segment
      const targetSegment = data.segment;
      const baseRotation = 360 * 5; // 5 full rotations
      const segmentRotation = targetSegment * SEGMENT_ANGLE;
      // Add offset to center on segment (subtract half segment + random offset within segment)
      const offset = SEGMENT_ANGLE / 2 + Math.random() * (SEGMENT_ANGLE * 0.4);
      const finalRotation = baseRotation + (360 - segmentRotation) + offset;

      // Animate the wheel
      await controls.start({
        rotate: finalRotation,
        transition: {
          duration: 4,
          ease: [0.2, 0.8, 0.2, 1],
        },
      });

      setResult(data);
      setStatus({ canSpin: false, nextSpinAt: data.nextSpinAt, lastXpWon: data.xpAmount });

      // Show confetti for rare wins
      if (data.xpAmount >= 100) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }

      toast.success(`You won ${data.xpAmount} XP!`, {
        description: "Come back tomorrow for another spin!",
        icon: <Sparkles className="w-4 h-4 text-yellow-500" />,
      });
    } catch (error) {
      console.error("Spin error:", error);
      toast.error("Failed to spin the wheel");
    } finally {
      setIsSpinning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="relative overflow-hidden group"
          size="sm"
        >
          <Gift className="w-4 h-4 mr-2 group-hover:animate-bounce" />
          Daily Spin
          {status?.canSpin && (
            <motion.span
              className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {showConfetti && (
          <Confetti
            width={400}
            height={500}
            recycle={false}
            numberOfPieces={200}
          />
        )}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Daily Spin Wheel
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          {/* Wheel Container */}
          <div className="relative w-64 h-64">
            {/* Pointer */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
              <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
            </div>

            {/* Wheel */}
            <motion.div
              ref={wheelRef}
              animate={controls}
              className="w-full h-full rounded-full border-4 border-primary/20 shadow-xl overflow-hidden"
              style={{ transformOrigin: "center center" }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {WHEEL_SEGMENTS.map((segment, index) => {
                  const startAngle = index * SEGMENT_ANGLE;
                  const endAngle = startAngle + SEGMENT_ANGLE;
                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;

                  const x1 = 50 + 50 * Math.cos(startRad);
                  const y1 = 50 + 50 * Math.sin(startRad);
                  const x2 = 50 + 50 * Math.cos(endRad);
                  const y2 = 50 + 50 * Math.sin(endRad);

                  const largeArcFlag = SEGMENT_ANGLE > 180 ? 1 : 0;

                  const midAngleRad = ((startAngle + SEGMENT_ANGLE / 2) * Math.PI) / 180;
                  const textX = 50 + 30 * Math.cos(midAngleRad);
                  const textY = 50 + 30 * Math.sin(midAngleRad);
                  const textRotation = startAngle + SEGMENT_ANGLE / 2;

                  return (
                    <g key={index}>
                      <defs>
                        <linearGradient
                          id={`gradient-${index}`}
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor={getColorValue(segment.color, 0)} />
                          <stop offset="100%" stopColor={getColorValue(segment.color, 1)} />
                        </linearGradient>
                      </defs>
                      <path
                        d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                        fill={`url(#gradient-${index})`}
                        stroke="white"
                        strokeWidth="0.5"
                      />
                      <text
                        x={textX}
                        y={textY}
                        fill="white"
                        fontSize="6"
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                        className="drop-shadow"
                      >
                        {segment.label}
                      </text>
                      {segment.rare && (
                        <text
                          x={textX}
                          y={textY + 8}
                          fill="white"
                          fontSize="4"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${textRotation}, ${textX}, ${textY + 8})`}
                        >
                        </text>
                      )}
                    </g>
                  );
                })}
                {/* Center circle */}
                <circle cx="50" cy="50" r="8" fill="white" stroke="currentColor" strokeWidth="1" />
                <circle cx="50" cy="50" r="6" fill="currentColor" className="text-primary" />
              </svg>
            </motion.div>
          </div>

          {/* Spin Button */}
          <div className="mt-6 text-center">
            {status?.canSpin ? (
              <Button
                onClick={handleSpin}
                disabled={isSpinning}
                size="lg"
                className="gradient-bg text-white px-8"
              >
                {isSpinning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Spinning...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Spin Now!
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">
                  Come back tomorrow for another spin!
                </p>
                {timeLeft && (
                  <p className="text-lg font-mono font-bold text-primary">
                    {timeLeft}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Result Display */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 text-center"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10">
                  <Zap className="w-5 h-5 text-primary" />
                  <span className="text-lg font-bold text-primary">
                    +{result.xpAmount} XP
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rewards preview */}
          <div className="mt-6 w-full">
            <p className="text-xs text-muted-foreground text-center mb-2">
              Possible rewards:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {WHEEL_SEGMENTS.filter((s, i) => i < 4 || s.rare).map((segment, i) => (
                <div
                  key={i}
                  className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    segment.rare
                      ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white"
                      : "bg-muted"
                  )}
                >
                  {segment.label}
                  {segment.rare && " "}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper to extract color values from Tailwind gradient class
function getColorValue(colorClass: string, index: number): string {
  const colorMap: Record<string, [string, string]> = {
    "from-blue-400 to-blue-600": ["#60a5fa", "#2563eb"],
    "from-green-400 to-green-600": ["#4ade80", "#16a34a"],
    "from-purple-400 to-purple-600": ["#c084fc", "#9333ea"],
    "from-amber-400 to-amber-600": ["#fbbf24", "#d97706"],
    "from-pink-400 to-pink-600": ["#f472b6", "#db2777"],
    "from-cyan-400 to-cyan-600": ["#22d3ee", "#0891b2"],
    "from-indigo-400 to-indigo-600": ["#818cf8", "#4f46e5"],
    "from-yellow-400 to-orange-500": ["#facc15", "#f97316"],
  };
  return colorMap[colorClass]?.[index] || (index === 0 ? "#888" : "#666");
}

// Compact button version for navbar/header
export function DailySpinButton() {
  const [canSpin, setCanSpin] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/daily-spin");
        if (res.ok) {
          const data = await res.json();
          setCanSpin(data.canSpin);
        }
      } catch {
        // Ignore errors
      }
    }
    checkStatus();
  }, []);

  return <DailySpinWheel />;
}
