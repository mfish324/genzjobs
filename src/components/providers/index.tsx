"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "./session-provider";
import { Toaster } from "@/components/ui/sonner";
import { LevelUpProvider } from "@/components/level-up-celebration";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider>
        <LevelUpProvider>
          {children}
        </LevelUpProvider>
        <Toaster position="top-right" richColors />
      </SessionProvider>
    </ThemeProvider>
  );
}
