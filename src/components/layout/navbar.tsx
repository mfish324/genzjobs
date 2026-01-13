"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Zap,
  Briefcase,
  Target,
  Gift,
  MessageSquare,
  Calendar,
  BookOpen,
  Gamepad2,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Settings,
  Building2,
  Sparkles,
  Bookmark,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { levelProgress, xpToNextLevel } from "@/lib/constants";

const navigation = [
  { name: "Jobs", href: "/jobs", icon: Briefcase },
  { name: "Quests", href: "/quests", icon: Target },
  { name: "Rewards", href: "/rewards", icon: Gift },
  { name: "Community", href: "/community", icon: MessageSquare },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Resources", href: "/resources", icon: BookOpen },
  { name: "Games", href: "/games", icon: Gamepad2 },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const user = session?.user;
  const xp = user?.xp || 0;
  const level = user?.level || 1;

  return (
    <header className="sticky top-0 z-50 w-full border-b glass">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:scale-105">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-xl gradient-text">GenZJobs</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-105"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive && "animate-pulse")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle />

            {status === "loading" ? (
              <div className="w-8 h-8 rounded-full shimmer" />
            ) : user ? (
              <>
                {/* XP Display - Desktop */}
                <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                  <div className="text-center">
                    <p className="text-xs font-medium text-muted-foreground">Level</p>
                    <p className="text-lg font-bold text-primary">{level}</p>
                  </div>
                  <div className="h-8 w-px bg-primary/20" />
                  <div className="min-w-[100px]">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary" />
                        {xp} XP
                      </span>
                      <span className="text-muted-foreground">{xpToNextLevel(xp)} to go</span>
                    </div>
                    <Progress value={levelProgress(xp)} className="h-2" />
                  </div>
                </div>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-muted/50">
                      <Avatar className="w-8 h-8 ring-2 ring-primary/20 transition-all hover:ring-primary/40">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback className="gradient-bg text-white font-semibold">
                          {user.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden md:inline text-sm font-medium">{user.name}</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="font-semibold">{user.name}</span>
                        <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* Mobile XP Display */}
                    <div className="md:hidden px-2 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="gradient-bg text-white">Level {level}</Badge>
                        <span className="text-sm font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-primary" />
                          {xp} XP
                        </span>
                      </div>
                      <Progress value={levelProgress(xp)} className="h-2" />
                    </div>
                    <DropdownMenuSeparator className="md:hidden" />

                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="cursor-pointer gap-2">
                        <User className="w-4 h-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer gap-2">
                        <Settings className="w-4 h-4" />
                        Profile Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/applications" className="cursor-pointer gap-2">
                        <Briefcase className="w-4 h-4" />
                        My Applications
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/saved-jobs" className="cursor-pointer gap-2">
                        <Bookmark className="w-4 h-4" />
                        Saved Jobs
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/employer" className="cursor-pointer gap-2">
                        <Building2 className="w-4 h-4" />
                        Employer Portal
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="text-destructive cursor-pointer gap-2 focus:text-destructive"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild className="hidden sm:inline-flex">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild className="gradient-bg hover:opacity-90 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-105">
                  <Link href="/register">Get Started</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-lg gradient-text">GenZJobs</span>
                </div>
                <nav className="flex flex-col gap-2">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        {item.name}
                        {isActive && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
