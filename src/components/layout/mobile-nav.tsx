"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Search,
  Target,
  Gift,
  User,
  Flame,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { name: "Feed", href: "/feed", icon: Layers },
  { name: "Quests", href: "/quests", icon: Target },
  { name: "Search", href: "/jobs", icon: Search },
  { name: "Rewards", href: "/rewards", icon: Gift },
  { name: "Profile", href: "/dashboard", icon: User, requiresAuth: true },
];

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Hide on scroll down (after 100px), show on scroll up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const user = session?.user;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 400 }}
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
        >
          {/* Floating container */}
          <div className="mx-3 mb-3 rounded-2xl glass border shadow-lg shadow-black/10">
            <div className="flex items-center justify-around py-2 px-1">
              {mobileNavItems.map((item) => {
                // Handle auth-required items
                if (item.requiresAuth && !session) {
                  return (
                    <Link
                      key={item.name}
                      href="/login"
                      className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[56px]"
                    >
                      <item.icon className="w-5 h-5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground font-medium">
                        Sign In
                      </span>
                    </Link>
                  );
                }

                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="relative flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[56px]"
                  >
                    <motion.div
                      className={cn(
                        "relative flex flex-col items-center gap-1 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                      whileTap={{ scale: 0.9 }}
                    >
                      {/* Active background indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="mobileActiveTab"
                          className="absolute -inset-2 rounded-xl bg-primary/10"
                          transition={{
                            type: "spring",
                            damping: 30,
                            stiffness: 500,
                          }}
                        />
                      )}

                      <div className="relative z-10">
                        <item.icon
                          className={cn(
                            "w-5 h-5 transition-transform",
                            isActive && "scale-110"
                          )}
                        />
                        {/* Active dot indicator */}
                        {isActive && (
                          <motion.span
                            className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary"
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                          />
                        )}
                      </div>

                      <span
                        className={cn(
                          "text-[10px] font-medium relative z-10",
                          isActive ? "text-primary font-semibold" : "text-muted-foreground"
                        )}
                      >
                        {item.name}
                      </span>
                    </motion.div>
                  </Link>
                );
              })}
            </div>

            {/* User XP/Level indicator when logged in */}
            {user && (
              <div className="flex items-center justify-center gap-3 pb-2.5 text-[10px]">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="font-semibold text-primary">
                    {user.xp || 0} XP
                  </span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10">
                  <Flame className="w-3 h-3 text-amber-500" />
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    Lvl {user.level || 1}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Safe area spacer for iOS home indicator */}
          <div className="h-safe-bottom bg-transparent" />
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
