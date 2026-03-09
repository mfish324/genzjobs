"use client";

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from "react";
import ReactConfetti from "react-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";
import { getLevelTitle } from "@/lib/constants";

interface LevelUpContextType {
  triggerLevelUp: (newLevel: number) => void;
}

const LevelUpContext = createContext<LevelUpContextType>({
  triggerLevelUp: () => {},
});

export function useLevelUp() {
  return useContext(LevelUpContext);
}

export function LevelUpProvider({ children }: { children: ReactNode }) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [level, setLevel] = useState(0);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const triggerLevelUp = useCallback((newLevel: number) => {
    setLevel(newLevel);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3500);
  }, []);

  return (
    <LevelUpContext.Provider value={{ triggerLevelUp }}>
      {children}
      <AnimatePresence>
        {showCelebration && (
          <>
            <ReactConfetti
              width={windowSize.width}
              height={windowSize.height}
              recycle={false}
              numberOfPieces={300}
              gravity={0.3}
              colors={["#8b5cf6", "#d946ef", "#06b6d4", "#84cc16", "#f97316"]}
              style={{ position: "fixed", top: 0, left: 0, zIndex: 9999 }}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm"
              onClick={() => setShowCelebration(false)}
            >
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.3, opacity: 0 }}
                transition={{ type: "spring", damping: 15, stiffness: 200 }}
                className="text-center"
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4 drop-shadow-lg" />
                </motion.div>
                <motion.h1
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-5xl font-extrabold text-white mb-2 drop-shadow-lg"
                >
                  LEVEL UP!
                </motion.h1>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <p className="text-2xl font-bold gradient-text mb-1">Level {level}</p>
                  <p className="text-lg text-white/80">{getLevelTitle(level)}</p>
                </motion.div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </LevelUpContext.Provider>
  );
}
