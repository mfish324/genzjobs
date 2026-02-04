"use client";

import { motion } from "framer-motion";
import { Zap, Bookmark, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface XPGainAnimationProps {
  amount: number;
  type: "save" | "interest" | "quest";
  multiplier?: number;
}

export function XPGainAnimation({ amount, type, multiplier = 1 }: XPGainAnimationProps) {
  const icon = {
    save: <Bookmark className="w-4 h-4" />,
    interest: <Heart className="w-4 h-4" />,
    quest: <Zap className="w-4 h-4" />,
  }[type];

  const color = {
    save: "from-green-500 to-emerald-500",
    interest: "from-violet-500 to-purple-500",
    quest: "from-amber-500 to-orange-500",
  }[type];

  return (
    <motion.div
      className="fixed inset-x-0 top-20 flex justify-center pointer-events-none z-50"
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <motion.div
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full text-white font-bold shadow-lg",
          `bg-gradient-to-r ${color}`
        )}
        animate={{
          y: [0, -10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 0.6,
          times: [0, 0.5, 1],
        }}
      >
        {icon}
        <span className="text-lg">+{amount} XP</span>
        {multiplier > 1 && (
          <motion.span
            className="ml-1 text-sm opacity-90 flex items-center gap-1"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-amber-200">{multiplier}x</span>
          </motion.span>
        )}
      </motion.div>

      {/* Particle effects */}
      <ParticleEffects color={color} />
    </motion.div>
  );
}

function ParticleEffects({ color }: { color: string }) {
  const particles = Array.from({ length: 8 }, (_, i) => i);

  return (
    <>
      {particles.map((i) => (
        <motion.div
          key={i}
          className={cn(
            "absolute w-2 h-2 rounded-full",
            `bg-gradient-to-r ${color}`
          )}
          initial={{
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
          }}
          animate={{
            opacity: 0,
            x: Math.cos((i * Math.PI * 2) / 8) * 60,
            y: Math.sin((i * Math.PI * 2) / 8) * 60 - 20,
            scale: 0,
          }}
          transition={{
            duration: 0.8,
            delay: 0.1,
            ease: "easeOut",
          }}
        />
      ))}
    </>
  );
}
