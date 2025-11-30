"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, User, Briefcase, MapPin, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPERIENCE_LEVELS, JOB_TYPES, COMMON_SKILLS } from "@/lib/constants";

interface ProfileData {
  name: string;
  bio: string;
  experience: string;
  skills: string[];
  jobTypes: string[];
  locations: string[];
  remoteOnly: boolean;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [newSkill, setNewSkill] = useState("");
  const [newLocation, setNewLocation] = useState("");

  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    bio: "",
    experience: "",
    skills: [],
    jobTypes: [],
    locations: [],
    remoteOnly: false,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile({
            name: data.name || "",
            bio: data.bio || "",
            experience: data.experience || "",
            skills: data.skills || [],
            jobTypes: data.jobTypes || [],
            locations: data.locations || [],
            remoteOnly: data.remoteOnly || false,
          });
        }
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setIsFetching(false);
      }
    }

    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!res.ok) {
        throw new Error("Failed to update profile");
      }

      const data = await res.json();

      if (data.xpEarned) {
        toast.success(`Profile updated! +${data.xpEarned} XP earned!`);
      } else {
        toast.success("Profile updated successfully!");
      }

      await update();
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !profile.skills.includes(skill)) {
      setProfile((prev) => ({ ...prev, skills: [...prev.skills, skill] }));
    }
    setNewSkill("");
  };

  const removeSkill = (skill: string) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  const addLocation = () => {
    if (newLocation && !profile.locations.includes(newLocation)) {
      setProfile((prev) => ({
        ...prev,
        locations: [...prev.locations, newLocation],
      }));
    }
    setNewLocation("");
  };

  const removeLocation = (location: string) => {
    setProfile((prev) => ({
      ...prev,
      locations: prev.locations.filter((l) => l !== location),
    }));
  };

  const toggleJobType = (type: string) => {
    setProfile((prev) => ({
      ...prev,
      jobTypes: prev.jobTypes.includes(type)
        ? prev.jobTypes.filter((t) => t !== type)
        : [...prev.jobTypes, type],
    }));
  };

  if (status === "loading" || isFetching) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-muted-foreground">
          Complete your profile to get better job matches and earn XP!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Basic Information
            </CardTitle>
            <CardDescription>Tell us about yourself</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell potential employers about yourself..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Experience Level</Label>
              <Select
                value={profile.experience}
                onValueChange={(value) => setProfile((prev) => ({ ...prev, experience: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your experience level" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Skills
            </CardTitle>
            <CardDescription>Add your skills to improve job matching</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeSkill(skill)}
                >
                  {skill} ×
                </Badge>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add a skill..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill(newSkill);
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={() => addSkill(newSkill)}>
                Add
              </Button>
            </div>

            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-2">Popular skills:</p>
              <div className="flex flex-wrap gap-2">
                {COMMON_SKILLS.slice(0, 12).map((skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className={`cursor-pointer ${
                      profile.skills.includes(skill)
                        ? "bg-violet-100 border-violet-500"
                        : "hover:bg-muted"
                    }`}
                    onClick={() =>
                      profile.skills.includes(skill) ? removeSkill(skill) : addSkill(skill)
                    }
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Job Preferences
            </CardTitle>
            <CardDescription>What types of jobs are you looking for?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Job Types</Label>
              <div className="flex flex-wrap gap-2">
                {JOB_TYPES.map((type) => (
                  <Badge
                    key={type.value}
                    variant={profile.jobTypes.includes(type.value) ? "default" : "outline"}
                    className={`cursor-pointer ${
                      profile.jobTypes.includes(type.value)
                        ? "bg-violet-500 hover:bg-violet-600"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => toggleJobType(type.value)}
                  >
                    {type.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remoteOnly"
                checked={profile.remoteOnly}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, remoteOnly: e.target.checked }))
                }
                className="rounded border-gray-300"
              />
              <Label htmlFor="remoteOnly">Remote opportunities only</Label>
            </div>
          </CardContent>
        </Card>

        {/* Locations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Preferred Locations
            </CardTitle>
            <CardDescription>Where would you like to work?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {profile.locations.map((location) => (
                <Badge
                  key={location}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeLocation(location)}
                >
                  {location} ×
                </Badge>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Add a location (e.g., New York, NY)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLocation();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addLocation}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isLoading ? "Saving..." : "Save Profile"}
        </Button>
      </form>
    </div>
  );
}
