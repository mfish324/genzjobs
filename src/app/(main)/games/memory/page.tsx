"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const EMOJIS = ["🎮", "🎯", "🎪", "🎨", "🎭", "🎤", "🎧", "🎬"];

interface CardType {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function MemoryGame() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [gameComplete, setGameComplete] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("memory-best-score");
    if (saved) setBestScore(parseInt(saved));
    initializeGame();
  }, []);

  const initializeGame = () => {
    const shuffledEmojis = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffledEmojis);
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setGameComplete(false);
  };

  const handleCardClick = (id: number) => {
    if (isLocked) return;
    if (flippedCards.includes(id)) return;
    if (cards[id].isMatched) return;
    if (flippedCards.length === 2) return;

    const newCards = [...cards];
    newCards[id].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      setIsLocked(true);

      const [first, second] = newFlipped;
      if (cards[first].emoji === cards[second].emoji) {
        // Match found
        setTimeout(() => {
          const matchedCards = [...cards];
          matchedCards[first].isMatched = true;
          matchedCards[second].isMatched = true;
          setCards(matchedCards);
          setFlippedCards([]);
          setIsLocked(false);
          setMatches((m) => {
            const newMatches = m + 1;
            if (newMatches === EMOJIS.length) {
              setGameComplete(true);
              const finalMoves = moves + 1;
              if (!bestScore || finalMoves < bestScore) {
                setBestScore(finalMoves);
                localStorage.setItem("memory-best-score", finalMoves.toString());
              }
            }
            return newMatches;
          });
        }, 300);
      } else {
        // No match
        setTimeout(() => {
          const resetCards = [...cards];
          resetCards[first].isFlipped = false;
          resetCards[second].isFlipped = false;
          setCards(resetCards);
          setFlippedCards([]);
          setIsLocked(false);
        }, 1000);
      }
    }
  };

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
                <span className="text-2xl">🧠</span>
                Memory Match
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Moves</p>
                  <p className="text-xl font-bold">{moves}</p>
                </div>
                {bestScore && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Trophy className="w-3 h-3" /> Best
                    </p>
                    <p className="text-xl font-bold text-violet-600">{bestScore}</p>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="grid grid-cols-4 gap-2">
                {cards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(card.id)}
                    disabled={card.isFlipped || card.isMatched || isLocked}
                    className={`w-16 h-16 rounded-lg text-3xl flex items-center justify-center transition-all duration-300 transform ${
                      card.isFlipped || card.isMatched
                        ? "bg-violet-100 rotate-0"
                        : "bg-violet-500 hover:bg-violet-600 rotate-y-180"
                    } ${card.isMatched ? "opacity-50" : ""}`}
                  >
                    {(card.isFlipped || card.isMatched) ? card.emoji : "?"}
                  </button>
                ))}
              </div>

              {gameComplete && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="text-center text-white">
                    <p className="text-2xl font-bold mb-2">Well Done! 🎉</p>
                    <p className="mb-4">Completed in {moves} moves</p>
                    <Button onClick={initializeGame}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Play Again
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Matches: {matches}/{EMOJIS.length}
              </p>
              <Button variant="outline" size="sm" onClick={initializeGame}>
                <RotateCcw className="w-4 h-4 mr-1" /> New Game
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Find all matching pairs in the fewest moves possible!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
