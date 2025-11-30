import Link from "next/link";
import {
  Zap,
  Target,
  Users,
  Trophy,
  Briefcase,
  Star,
  ArrowRight,
  Gamepad2,
  MessageSquare,
  Gift,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Target,
    title: "Daily Quests",
    description: "Complete challenges to earn XP and level up your career journey.",
    color: "text-violet-500",
    bg: "bg-violet-50",
  },
  {
    icon: Trophy,
    title: "Earn Rewards",
    description: "Redeem XP for resume reviews, mock interviews, and gift cards.",
    color: "text-fuchsia-500",
    bg: "bg-fuchsia-50",
  },
  {
    icon: Briefcase,
    title: "Smart Job Matching",
    description: "AI-powered matching finds opportunities that fit your skills.",
    color: "text-purple-500",
    bg: "bg-purple-50",
  },
  {
    icon: Users,
    title: "Join the Community",
    description: "Connect with other job seekers, share tips, and support each other.",
    color: "text-pink-500",
    bg: "bg-pink-50",
  },
  {
    icon: MessageSquare,
    title: "Live Chat Rooms",
    description: "Real-time discussions on job tips, career advice, and more.",
    color: "text-indigo-500",
    bg: "bg-indigo-50",
  },
  {
    icon: Gamepad2,
    title: "Stress Relief Games",
    description: "Take a break with arcade games when the job search gets tough.",
    color: "text-cyan-500",
    bg: "bg-cyan-50",
  },
];

const stats = [
  { value: "10K+", label: "Active Job Seekers" },
  { value: "50K+", label: "Jobs Available" },
  { value: "1M+", label: "XP Earned" },
  { value: "500+", label: "Rewards Redeemed" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        <div className="container mx-auto px-4 py-24 md:py-32 relative z-10">
          <div className="max-w-3xl mx-auto text-center text-white">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm mb-6">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">Level up your career today</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Job Searching
              <br />
              <span className="text-yellow-300">Made Fun</span>
            </h1>

            <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              GenZJobs transforms the job hunt into a game. Earn XP for applications,
              complete quests, unlock rewards, and connect with a community that gets it.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                asChild
                className="bg-white text-violet-600 hover:bg-white/90"
              >
                <Link href="/register">
                  Start Your Journey
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-white text-white hover:bg-white/10"
              >
                <Link href="/jobs">Browse Jobs</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-violet-600">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to
              <span className="text-violet-600"> level up</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We&apos;ve packed GenZJobs with features that make job searching actually enjoyable.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                      <Icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-muted-foreground">
              Get started in minutes and begin earning XP right away
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Create Your Profile",
                  description: "Sign up and add your skills, experience, and job preferences.",
                  xp: "+100 XP",
                },
                {
                  step: "2",
                  title: "Complete Quests",
                  description: "Apply to jobs, update your profile, and engage with the community.",
                  xp: "+25-150 XP",
                },
                {
                  step: "3",
                  title: "Redeem Rewards",
                  description: "Exchange XP for resume reviews, mock interviews, and more.",
                  xp: "Unlock perks",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm mb-2">{item.description}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 bg-violet-50 px-2 py-1 rounded-full">
                    <Star className="w-3 h-3" />
                    {item.xp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto text-white">
            <Gift className="w-16 h-16 mx-auto mb-6 text-yellow-300" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to start leveling up?
            </h2>
            <p className="text-white/90 mb-8">
              Join thousands of Gen-Z job seekers who are transforming their career journey
              into an adventure.
            </p>
            <Button
              size="lg"
              asChild
              className="bg-white text-violet-600 hover:bg-white/90"
            >
              <Link href="/register">
                Create Free Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-gray-400">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">GenZJobs</span>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} GenZJobs. All rights reserved.
            </p>
            <div className="flex gap-4 text-sm">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
