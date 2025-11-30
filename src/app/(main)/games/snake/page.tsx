"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Pause, Play, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Position = { x: number; y: number };

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const directionRef = useRef<Direction>("RIGHT");

  // Load high score from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("snake-high-score");
    if (saved) setHighScore(parseInt(saved));
  }, []);

  const generateFood = useCallback((): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snake.some((s) => s.x === newFood.x && s.y === newFood.y));
    return newFood;
  }, [snake]);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood(generateFood());
    setDirection("RIGHT");
    directionRef.current = "RIGHT";
    setScore(0);
    setGameOver(false);
    setIsPlaying(false);
  };

  const moveSnake = useCallback(() => {
    setSnake((prev) => {
      const head = prev[0];
      let newHead: Position;

      switch (directionRef.current) {
        case "UP":
          newHead = { x: head.x, y: head.y - 1 };
          break;
        case "DOWN":
          newHead = { x: head.x, y: head.y + 1 };
          break;
        case "LEFT":
          newHead = { x: head.x - 1, y: head.y };
          break;
        case "RIGHT":
          newHead = { x: head.x + 1, y: head.y };
          break;
      }

      // Check collision with walls
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        setGameOver(true);
        setIsPlaying(false);
        return prev;
      }

      // Check collision with self
      if (prev.some((s) => s.x === newHead.x && s.y === newHead.y)) {
        setGameOver(true);
        setIsPlaying(false);
        return prev;
      }

      const newSnake = [newHead, ...prev];

      // Check if eating food
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((s) => {
          const newScore = s + 10;
          if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem("snake-high-score", newScore.toString());
          }
          return newScore;
        });
        setFood(generateFood());
        return newSnake;
      }

      newSnake.pop();
      return newSnake;
    });
  }, [food, generateFood, highScore]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const interval = setInterval(moveSnake, INITIAL_SPEED);
    return () => clearInterval(interval);
  }, [isPlaying, gameOver, moveSnake]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case "ArrowUp":
        case "w":
          if (directionRef.current !== "DOWN") {
            directionRef.current = "UP";
            setDirection("UP");
          }
          break;
        case "ArrowDown":
        case "s":
          if (directionRef.current !== "UP") {
            directionRef.current = "DOWN";
            setDirection("DOWN");
          }
          break;
        case "ArrowLeft":
        case "a":
          if (directionRef.current !== "RIGHT") {
            directionRef.current = "LEFT";
            setDirection("LEFT");
          }
          break;
        case "ArrowRight":
        case "d":
          if (directionRef.current !== "LEFT") {
            directionRef.current = "RIGHT";
            setDirection("RIGHT");
          }
          break;
        case " ":
          if (!gameOver) {
            setIsPlaying((p) => !p);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameOver]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);

    // Draw grid
    ctx.strokeStyle = "#e2e8f0";
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw snake
    snake.forEach((segment, index) => {
      const gradient = ctx.createLinearGradient(
        segment.x * CELL_SIZE,
        segment.y * CELL_SIZE,
        (segment.x + 1) * CELL_SIZE,
        (segment.y + 1) * CELL_SIZE
      );
      gradient.addColorStop(0, index === 0 ? "#7c3aed" : "#8b5cf6");
      gradient.addColorStop(1, index === 0 ? "#a855f7" : "#a78bfa");

      ctx.fillStyle = gradient;
      ctx.fillRect(
        segment.x * CELL_SIZE + 1,
        segment.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      );
    });

    // Draw food
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }, [snake, food]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/games">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Arcade
        </Link>
      </Button>

      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🐍</span>
                Snake
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="text-xl font-bold">{score}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> High
                  </p>
                  <p className="text-xl font-bold text-violet-600">{highScore}</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={GRID_SIZE * CELL_SIZE}
                height={GRID_SIZE * CELL_SIZE}
                className="border-2 border-gray-200 rounded-lg"
              />

              {gameOver && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="text-center text-white">
                    <p className="text-2xl font-bold mb-2">Game Over!</p>
                    <p className="mb-4">Score: {score}</p>
                    <Button onClick={resetGame}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Play Again
                    </Button>
                  </div>
                </div>
              )}

              {!isPlaying && !gameOver && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-lg">
                  <Button
                    onClick={() => setIsPlaying(true)}
                    className="bg-violet-500 hover:bg-violet-600"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {score > 0 ? "Resume" : "Start Game"}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={gameOver}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 mr-1" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-1" /> Play
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={resetGame}>
                <RotateCcw className="w-4 h-4 mr-1" /> Reset
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>Use arrow keys or WASD to move</p>
              <p>Press Space to pause/resume</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
