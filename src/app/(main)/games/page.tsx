"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Gamepad2,
  Grid3X3,
  Bomb,
  Apple,
  Brain,
  Crown,
  Keyboard,
  ArrowRight,
  Trophy,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const games = [
  {
    id: "snake",
    name: "Snake",
    description: "Classic arcade snake game. Eat the food, grow longer, don't hit yourself!",
    icon: Apple,
    color: "bg-green-500",
    difficulty: "Easy",
  },
  {
    id: "2048",
    name: "2048",
    description: "Slide numbered tiles to combine them and reach 2048!",
    icon: Grid3X3,
    color: "bg-yellow-500",
    difficulty: "Medium",
  },
  {
    id: "minesweeper",
    name: "Minesweeper",
    description: "Clear the minefield without hitting any bombs. Classic puzzle game.",
    icon: Bomb,
    color: "bg-gray-500",
    difficulty: "Medium",
  },
  {
    id: "memory",
    name: "Memory Match",
    description: "Flip cards and find matching pairs. Test your memory!",
    icon: Brain,
    color: "bg-purple-500",
    difficulty: "Easy",
  },
  {
    id: "wordle",
    name: "Wordle",
    description: "Guess the 5-letter word in 6 tries. Green = correct, Yellow = wrong position.",
    icon: Keyboard,
    color: "bg-emerald-500",
    difficulty: "Medium",
  },
  {
    id: "chess",
    name: "Chess",
    description: "Play chess against a simple AI. Sharpen your strategic thinking!",
    icon: Crown,
    color: "bg-amber-600",
    difficulty: "Hard",
  },
];

export default function GamesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Arcade</h1>
        <p className="text-muted-foreground">
          Take a break from job hunting with some stress-relief games!
        </p>
      </div>

      {/* Coming Soon Banner */}
      <Card className="mb-8 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">XP Rewards Coming Soon!</h3>
              <p className="text-white/90">
                Earn XP for high scores and completing daily game challenges
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game) => {
          const Icon = game.icon;

          return (
            <Link key={game.id} href={`/games/${game.id}`}>
              <Card className="h-full hover:border-violet-300 hover:shadow-lg transition-all cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-14 h-14 rounded-xl ${game.color} flex items-center justify-center`}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        game.difficulty === "Easy"
                          ? "border-green-500 text-green-500"
                          : game.difficulty === "Medium"
                          ? "border-yellow-500 text-yellow-500"
                          : "border-red-500 text-red-500"
                      }
                    >
                      {game.difficulty}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-lg mb-2">{game.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{game.description}</p>

                  <div className="flex items-center text-violet-500 text-sm font-medium group-hover:gap-2 transition-all">
                    Play Now
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
