"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Copy, Share2, Users, Gift, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ReferralStats {
  totalReferred: number;
  totalQualified: number;
  totalXpEarned: number;
  referrals: Array<{
    id: string;
    referredName: string | null;
    status: string;
    xpAwarded: number;
    createdAt: string;
  }>;
}

export function ReferralCard() {
  const { data: session } = useSession();
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    // Fetch referral code and stats in parallel
    Promise.all([
      fetch("/api/referrals/code").then((r) => r.json()),
      fetch("/api/referrals/stats").then((r) => r.json()),
    ]).then(([codeData, statsData]) => {
      if (codeData.code) setCode(codeData.code);
      if (statsData.totalReferred !== undefined) setStats(statsData);
    }).catch(() => {
      // Non-critical
    });
  }, [session?.user]);

  const referralUrl = code
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${code}`
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join GenZJobs!",
          text: "Join GenZJobs and we both earn 200 XP! Use my referral link:",
          url: referralUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  if (!session?.user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-violet-500" />
          Refer Friends
        </CardTitle>
        <CardDescription>
          You both earn <span className="font-semibold text-violet-600 dark:text-violet-400">200 XP</span> when they apply to their first job!
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Referral link */}
        {code && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-mono truncate">
              {referralUrl}
            </div>
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button size="sm" onClick={handleShare} className="bg-violet-500 hover:bg-violet-600">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{stats.totalReferred}</p>
              <p className="text-xs text-muted-foreground">Referred</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{stats.totalQualified}</p>
              <p className="text-xs text-muted-foreground">Qualified</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30">
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                {stats.totalXpEarned}
              </p>
              <p className="text-xs text-muted-foreground">XP Earned</p>
            </div>
          </div>
        )}

        {/* Recent referrals */}
        {stats && stats.referrals.length > 0 && (
          <div className="mt-4 space-y-2">
            {stats.referrals.slice(0, 3).map((ref) => (
              <div
                key={ref.id}
                className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
              >
                <span className="text-muted-foreground">
                  {ref.referredName || "Anonymous"}
                </span>
                <Badge
                  variant="outline"
                  className={
                    ref.status === "rewarded"
                      ? "border-green-500 text-green-500"
                      : "border-yellow-500 text-yellow-500"
                  }
                >
                  {ref.status === "rewarded" ? (
                    <>
                      <Gift className="w-3 h-3 mr-1" />
                      +{ref.xpAwarded} XP
                    </>
                  ) : (
                    "Pending"
                  )}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
