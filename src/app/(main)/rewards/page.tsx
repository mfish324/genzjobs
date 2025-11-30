"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Gift,
  Star,
  Loader2,
  ShoppingBag,
  CheckCircle2,
  Sparkles,
  FileText,
  Coffee,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { REWARD_CATEGORIES } from "@/lib/constants";

interface Reward {
  id: string;
  title: string;
  description: string;
  category: string;
  xpCost: number;
  isActive: boolean;
  quantity: number | null;
  imageUrl: string | null;
}

export default function RewardsPage() {
  const { data: session, status: authStatus, update } = useSession();
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  useEffect(() => {
    async function fetchRewards() {
      try {
        const res = await fetch("/api/rewards");
        if (res.ok) {
          const data = await res.json();
          setRewards(data);
        }
      } catch {
        toast.error("Failed to load rewards");
      } finally {
        setIsLoading(false);
      }
    }

    fetchRewards();
  }, []);

  const handleRedeem = async () => {
    if (!selectedReward || !session?.user) return;

    setIsRedeeming(true);

    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId: selectedReward.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to redeem reward");
      }

      toast.success(data.message);
      setSelectedReward(null);
      await update();

      // Update quantity in local state
      setRewards((prev) =>
        prev.map((r) =>
          r.id === selectedReward.id && r.quantity !== null
            ? { ...r, quantity: r.quantity - 1 }
            : r
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to redeem reward");
    } finally {
      setIsRedeeming(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "career_service":
        return FileText;
      case "merchandise":
        return ShoppingBag;
      case "gift_card":
        return Gift;
      case "experience":
        return Users;
      default:
        return Sparkles;
    }
  };

  const userXp = session?.user?.xp || 0;

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  // Group rewards by category
  const groupedRewards = rewards.reduce((acc, reward) => {
    if (!acc[reward.category]) {
      acc[reward.category] = [];
    }
    acc[reward.category].push(reward);
    return acc;
  }, {} as Record<string, Reward[]>);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Rewards Shop</h1>
        <p className="text-muted-foreground">
          Redeem your hard-earned XP for real rewards!
        </p>
      </div>

      {/* XP Balance Card */}
      <Card className="mb-8 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Your XP Balance</p>
              <p className="text-4xl font-bold">{userXp} XP</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <Star className="w-8 h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rewards by Category */}
      {Object.entries(groupedRewards).map(([category, categoryRewards]) => {
        const categoryConfig = REWARD_CATEGORIES.find((c) => c.value === category);
        const Icon = getCategoryIcon(category);

        return (
          <div key={category} className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Icon className="w-5 h-5 text-violet-500" />
              </div>
              <h2 className="text-xl font-semibold">
                {categoryConfig?.label || category}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryRewards.map((reward) => {
                const canAfford = userXp >= reward.xpCost;
                const isOutOfStock = reward.quantity !== null && reward.quantity <= 0;

                return (
                  <Card
                    key={reward.id}
                    className={`transition-all ${
                      canAfford && !isOutOfStock
                        ? "hover:border-violet-300 hover:shadow-lg cursor-pointer"
                        : "opacity-60"
                    }`}
                    onClick={() =>
                      canAfford && !isOutOfStock && setSelectedReward(reward)
                    }
                  >
                    <CardContent className="p-6">
                      {reward.imageUrl && (
                        <div className="w-full h-32 mb-4 rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={reward.imageUrl}
                            alt={reward.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <h3 className="font-semibold mb-2">{reward.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {reward.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <Badge
                          variant={canAfford ? "default" : "secondary"}
                          className={canAfford ? "bg-violet-500" : ""}
                        >
                          <Star className="w-3 h-3 mr-1" />
                          {reward.xpCost} XP
                        </Badge>

                        {isOutOfStock ? (
                          <Badge variant="outline" className="text-red-500 border-red-500">
                            Out of Stock
                          </Badge>
                        ) : reward.quantity !== null ? (
                          <span className="text-xs text-muted-foreground">
                            {reward.quantity} left
                          </span>
                        ) : null}
                      </div>

                      {!canAfford && !isOutOfStock && (
                        <div className="mt-4">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Progress</span>
                            <span>
                              {userXp} / {reward.xpCost} XP
                            </span>
                          </div>
                          <Progress value={(userXp / reward.xpCost) * 100} className="h-2" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {rewards.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Gift className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No rewards available</h3>
            <p className="text-muted-foreground">Check back soon for exciting rewards!</p>
          </CardContent>
        </Card>
      )}

      {/* Redemption Dialog */}
      <Dialog open={!!selectedReward} onOpenChange={() => setSelectedReward(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem Reward</DialogTitle>
            <DialogDescription>
              Are you sure you want to redeem this reward?
            </DialogDescription>
          </DialogHeader>

          {selectedReward && (
            <div className="py-4">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted">
                <Gift className="w-10 h-10 text-violet-500" />
                <div>
                  <h4 className="font-semibold">{selectedReward.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedReward.description}
                  </p>
                  <Badge className="mt-2 bg-violet-500">
                    <Star className="w-3 h-3 mr-1" />
                    {selectedReward.xpCost} XP
                  </Badge>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-lg bg-violet-50 border border-violet-200">
                <div className="flex justify-between text-sm">
                  <span>Your balance</span>
                  <span className="font-medium">{userXp} XP</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Cost</span>
                  <span className="font-medium text-violet-600">
                    -{selectedReward.xpCost} XP
                  </span>
                </div>
                <div className="border-t border-violet-200 mt-2 pt-2 flex justify-between font-medium">
                  <span>Remaining</span>
                  <span>{userXp - selectedReward.xpCost} XP</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReward(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleRedeem}
              disabled={isRedeeming}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
            >
              {isRedeeming ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {isRedeeming ? "Redeeming..." : "Confirm Redemption"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
