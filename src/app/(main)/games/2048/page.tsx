"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GRID_SIZE = 4;

type Grid = (number | null)[][];

const getBackgroundColor = (value: number | null): string => {
  const colors: Record<number, string> = {
    2: "bg-amber-100",
    4: "bg-amber-200",
    8: "bg-orange-300",
    16: "bg-orange-400",
    32: "bg-orange-500",
    64: "bg-red-400",
    128: "bg-yellow-300",
    256: "bg-yellow-400",
    512: "bg-yellow-500",
    1024: "bg-yellow-600",
    2048: "bg-yellow-700",
  };
  return value ? colors[value] || "bg-purple-500" : "bg-gray-200";
};

const getTextColor = (value: number | null): string => {
  return value && value >= 8 ? "text-white" : "text-gray-800";
};

export default function Game2048() {
  const [grid, setGrid] = useState<Grid>(() => initializeGrid());
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("2048-high-score");
    if (saved) setHighScore(parseInt(saved));
  }, []);

  function initializeGrid(): Grid {
    const newGrid: Grid = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(null));
    addRandomTile(newGrid);
    addRandomTile(newGrid);
    return newGrid;
  }

  function addRandomTile(grid: Grid): void {
    const emptyCells: { row: number; col: number }[] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid[row][col] === null) {
          emptyCells.push({ row, col });
        }
      }
    }
    if (emptyCells.length > 0) {
      const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      grid[row][col] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  function slideRow(row: (number | null)[]): { row: (number | null)[]; score: number } {
    // Remove nulls and get values
    const values = row.filter((v) => v !== null) as number[];
    const result: (number | null)[] = [];
    let addScore = 0;

    // Merge adjacent same values
    let i = 0;
    while (i < values.length) {
      if (i + 1 < values.length && values[i] === values[i + 1]) {
        result.push(values[i] * 2);
        addScore += values[i] * 2;
        i += 2;
      } else {
        result.push(values[i]);
        i++;
      }
    }

    // Pad with nulls
    while (result.length < GRID_SIZE) {
      result.push(null);
    }

    return { row: result, score: addScore };
  }

  const move = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      if (gameOver) return;

      const newGrid = grid.map((row) => [...row]);
      let moved = false;
      let addedScore = 0;

      if (direction === "left") {
        for (let row = 0; row < GRID_SIZE; row++) {
          const { row: newRow, score } = slideRow(newGrid[row]);
          if (JSON.stringify(newGrid[row]) !== JSON.stringify(newRow)) moved = true;
          newGrid[row] = newRow;
          addedScore += score;
        }
      } else if (direction === "right") {
        for (let row = 0; row < GRID_SIZE; row++) {
          const { row: newRow, score } = slideRow([...newGrid[row]].reverse());
          const reversedRow = newRow.reverse();
          if (JSON.stringify(newGrid[row]) !== JSON.stringify(reversedRow)) moved = true;
          newGrid[row] = reversedRow;
          addedScore += score;
        }
      } else if (direction === "up") {
        for (let col = 0; col < GRID_SIZE; col++) {
          const column = newGrid.map((row) => row[col]);
          const { row: newColumn, score } = slideRow(column);
          for (let row = 0; row < GRID_SIZE; row++) {
            if (newGrid[row][col] !== newColumn[row]) moved = true;
            newGrid[row][col] = newColumn[row];
          }
          addedScore += score;
        }
      } else if (direction === "down") {
        for (let col = 0; col < GRID_SIZE; col++) {
          const column = newGrid.map((row) => row[col]).reverse();
          const { row: newColumn, score } = slideRow(column);
          const reversedColumn = newColumn.reverse();
          for (let row = 0; row < GRID_SIZE; row++) {
            if (newGrid[row][col] !== reversedColumn[row]) moved = true;
            newGrid[row][col] = reversedColumn[row];
          }
          addedScore += score;
        }
      }

      if (moved) {
        addRandomTile(newGrid);
        setGrid(newGrid);
        setScore((s) => {
          const newScore = s + addedScore;
          if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem("2048-high-score", newScore.toString());
          }
          return newScore;
        });

        // Check for 2048
        if (newGrid.some((row) => row.some((cell) => cell === 2048))) {
          setWon(true);
        }

        // Check for game over
        if (isGameOver(newGrid)) {
          setGameOver(true);
        }
      }
    },
    [grid, gameOver, highScore]
  );

  function isGameOver(grid: Grid): boolean {
    // Check for empty cells
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid[row][col] === null) return false;
      }
    }

    // Check for possible merges
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const value = grid[row][col];
        if (col < GRID_SIZE - 1 && grid[row][col + 1] === value) return false;
        if (row < GRID_SIZE - 1 && grid[row + 1][col] === value) return false;
      }
    }

    return true;
  }

  const resetGame = () => {
    setGrid(initializeGrid());
    setScore(0);
    setGameOver(false);
    setWon(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case "ArrowUp":
        case "w":
          e.preventDefault();
          move("up");
          break;
        case "ArrowDown":
        case "s":
          e.preventDefault();
          move("down");
          break;
        case "ArrowLeft":
        case "a":
          e.preventDefault();
          move("left");
          break;
        case "ArrowRight":
        case "d":
          e.preventDefault();
          move("right");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [move, gameOver]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/games">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Arcade
        </Link>
      </Button>

      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🔢</span>
                2048
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
              <div className="grid grid-cols-4 gap-2 bg-gray-300 p-2 rounded-lg">
                {grid.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`w-16 h-16 rounded-lg flex items-center justify-center font-bold text-lg transition-all ${getBackgroundColor(
                        cell
                      )} ${getTextColor(cell)}`}
                    >
                      {cell}
                    </div>
                  ))
                )}
              </div>

              {(gameOver || won) && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="text-center text-white">
                    <p className="text-2xl font-bold mb-2">
                      {won ? "You Won! 🎉" : "Game Over!"}
                    </p>
                    <p className="mb-4">Score: {score}</p>
                    <Button onClick={resetGame}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Play Again
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Button variant="outline" onClick={resetGame}>
              <RotateCcw className="w-4 h-4 mr-1" /> New Game
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <p>Use arrow keys or WASD to move tiles</p>
              <p>Combine matching numbers to reach 2048!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
