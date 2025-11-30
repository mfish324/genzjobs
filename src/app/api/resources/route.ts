import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const featured = searchParams.get("featured") === "true";

  try {
    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (featured) {
      where.isFeatured = true;
    }

    const resources = await prisma.resource.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { clickCount: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(resources);
  } catch (error) {
    console.error("Resources fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}

// Track click
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resourceId } = body;

    if (!resourceId) {
      return NextResponse.json({ error: "Resource ID required" }, { status: 400 });
    }

    await prisma.resource.update({
      where: { id: resourceId },
      data: { clickCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Click track error:", error);
    return NextResponse.json({ error: "Failed to track click" }, { status: 500 });
  }
}
