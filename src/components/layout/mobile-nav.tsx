"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Briefcase,
  Target,
  Map,
  User,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { name: "Jobs", href: "/jobs", icon: Briefcase },
  { name: "Map", href: "/map", icon: Map },
  { name: "Quests", href: "/quests", icon: Target },
  { name: "Profile", href: "/profile", icon: User, requiresAuth: true },
];

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass safe-bottom border-t">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNavItems.map((item) => {
          // Skip auth-required items if not logged in
          if (item.requiresAuth && !session) {
            return (
              <Link
                key={item.name}
                href="/login"
                className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px]"
              >
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Sign In</span>
              </Link>
            );
          }

          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] rounded-xl transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "relative p-1.5 rounded-xl transition-all duration-200",
                  isActive && "bg-primary/10"
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    isActive && "scale-110"
                  )}
                />
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-all duration-200",
                  isActive && "font-semibold"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* XP indicator for logged in users */}
        {session?.user && (
          <div className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px]">
            <div className="relative p-1.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-semibold text-primary">
              {session.user.xp || 0} XP
            </span>
          </div>
        )}
      </div>
    </nav>
  );
}
