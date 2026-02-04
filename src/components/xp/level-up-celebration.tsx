"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles, X } from "lucide-react";
import confetti from "canvas-confetti";

import { Button } from "@/components/ui/button";
import { useFeed } from "@/contexts/feed-context";

export function LevelUpCelebration() {
  const { showLevelUp, level, dismissLevelUp } = useFeed();

  useEffect(() => {
    if (showLevelUp) {
      // Trigger confetti
      const duration = 2000;
      const end = Date.now() + duration;

      const colors = ["#8b5cf6", "#a855f7", "#d946ef", "#f59e0b", "#22c55e"];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [showLevelUp]);

  return (
    <AnimatePresence>
      {showLevelUp && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismissLevelUp}
        >
          <motion.div
            className="relative mx-4 w-full max-w-sm bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-3xl p-1 shadow-2xl"
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: 50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-background rounded-[22px] p-6 text-center">
              {/* Close button */}
              <button
                onClick={dismissLevelUp}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>

              {/* Trophy icon */}
              <motion.div
                className="mx-auto mb-4 w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg"
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              >
                <Trophy className="w-10 h-10 text-white" />
              </motion.div>

              {/* Sparkles decoration */}
              <motion.div
                className="absolute top-12 left-8"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-6 h-6 text-amber-400" />
              </motion.div>
              <motion.div
                className="absolute top-16 right-10"
                animate={{ rotate: -360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-4 h-4 text-violet-400" />
              </motion.div>

              {/* Title */}
              <motion.h2
                className="text-2xl font-bold mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Level Up!
              </motion.h2>

              {/* Level display */}
              <motion.div
                className="mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                <span className="text-6xl font-black bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
                  {level}
                </span>
              </motion.div>

              {/* Message */}
              <motion.p
                className="text-muted-foreground mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Keep up the great work! You&apos;re making amazing progress on your job search journey.
              </motion.p>

              {/* CTA button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  onClick={dismissLevelUp}
                  className="w-full gradient-bg text-white font-semibold py-6"
                >
                  Keep Going!
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
