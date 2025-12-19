"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Video,
  Headphones,
  GraduationCap,
  Wrench,
  ExternalLink,
  Loader2,
  Star,
  Filter,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RESOURCE_TYPES, RESOURCE_CATEGORIES } from "@/lib/constants";

interface Resource {
  id: string;
  title: string;
  description: string;
  type: string;
  url: string;
  imageUrl: string | null;
  whyItMatters: string | null;
  tags: string[];
  category: string | null;
  clickCount: number;
  isFeatured: boolean;
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  useEffect(() => {
    async function fetchResources() {
      try {
        const res = await fetch("/api/resources");
        if (res.ok) {
          const data = await res.json();
          setResources(data);
        }
      } catch {
        toast.error("Failed to load resources");
      } finally {
        setIsLoading(false);
      }
    }

    fetchResources();
  }, []);

  const handleClick = async (resource: Resource) => {
    // Track click
    fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceId: resource.id }),
    });

    // Open URL
    window.open(resource.url, "_blank");
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "article":
        return BookOpen;
      case "video":
        return Video;
      case "podcast":
        return Headphones;
      case "course":
        return GraduationCap;
      case "tool":
        return Wrench;
      default:
        return BookOpen;
    }
  };

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case "article":
        return "📝";
      case "video":
        return "🎬";
      case "podcast":
        return "🎙️";
      case "course":
        return "📚";
      case "tool":
        return "🛠️";
      default:
        return "📄";
    }
  };

  const filteredResources = categoryFilter
    ? resources.filter((r) => r.category === categoryFilter)
    : resources;

  const resourcesByType = {
    all: filteredResources,
    article: filteredResources.filter((r) => r.type === "article"),
    video: filteredResources.filter((r) => r.type === "video"),
    podcast: filteredResources.filter((r) => r.type === "podcast"),
    course: filteredResources.filter((r) => r.type === "course"),
    tool: filteredResources.filter((r) => r.type === "tool"),
  };

  const featuredResources = resources.filter((r) => r.isFeatured);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Resources</h1>
        <p className="text-muted-foreground">
          Curated content to help you level up your career skills
        </p>
      </div>

      {/* Featured Section */}
      {featuredResources.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Featured Resources
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredResources.slice(0, 3).map((resource) => (
              <Card
                key={resource.id}
                className="cursor-pointer hover:border-violet-300 hover:shadow-lg transition-all overflow-hidden"
                onClick={() => handleClick(resource)}
              >
                {resource.imageUrl && (
                  <div className="h-32 overflow-hidden">
                    <img
                      src={resource.imageUrl}
                      alt={resource.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <Badge variant="secondary">
                      {getTypeEmoji(resource.type)}{" "}
                      {RESOURCE_TYPES.find((t) => t.value === resource.type)?.label || resource.type}
                    </Badge>
                    <Badge className="bg-yellow-500">
                      <Star className="w-3 h-3 mr-1" />
                      Featured
                    </Badge>
                  </div>
                  <h3 className="font-semibold mb-2">{resource.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {resource.description}
                  </p>
                  {resource.whyItMatters && (
                    <div className="p-3 rounded-lg bg-violet-50 border border-violet-100">
                      <p className="text-xs font-medium text-violet-600 mb-1">
                        Why it matters:
                      </p>
                      <p className="text-xs text-violet-700">{resource.whyItMatters}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Category:</span>
        </div>
        <Select value={categoryFilter || "all"} onValueChange={(val) => setCategoryFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {RESOURCE_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Resources by Type */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All ({resourcesByType.all.length})</TabsTrigger>
          {RESOURCE_TYPES.map((type) => {
            const Icon = getTypeIcon(type.value);
            return (
              <TabsTrigger key={type.value} value={type.value} className="flex items-center gap-1">
                <Icon className="w-4 h-4" />
                {type.label} ({resourcesByType[type.value as keyof typeof resourcesByType]?.length || 0})
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(resourcesByType).map(([key, typeResources]) => (
          <TabsContent key={key} value={key}>
            {typeResources.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No resources found</h3>
                  <p className="text-muted-foreground">
                    {categoryFilter
                      ? "Try changing your category filter"
                      : "Check back later for new content!"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {typeResources.map((resource) => {
                  const Icon = getTypeIcon(resource.type);

                  return (
                    <Card
                      key={resource.id}
                      className="cursor-pointer hover:border-violet-300 hover:shadow-md transition-all"
                      onClick={() => handleClick(resource)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-violet-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <Badge variant="outline" className="mb-2 text-xs">
                              {RESOURCE_TYPES.find((t) => t.value === resource.type)?.label ||
                                resource.type}
                            </Badge>
                            <h3 className="font-semibold mb-1 line-clamp-2">
                              {resource.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {resource.description}
                            </p>

                            {resource.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {resource.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-4 pt-4 border-t">
                              <span className="text-xs text-muted-foreground">
                                {resource.clickCount} views
                              </span>
                              <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
