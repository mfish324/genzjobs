import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { parseResume, validateResumeFile } from "@/lib/resume-parser";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file
    const validation = validateResumeFile({
      size: file.size,
      type: file.type,
      name: file.name,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse resume content
    let parseResult;
    try {
      parseResult = await parseResume(buffer, file.type);
    } catch (parseError) {
      console.error("Resume parse error:", parseError);
      return NextResponse.json(
        { error: "Failed to parse resume. Please ensure it's a valid PDF or Word document." },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob storage
    let fileUrl: string;
    try {
      const blob = await put(`resumes/${session.user.id}/${Date.now()}-${file.name}`, buffer, {
        access: "public",
        contentType: file.type,
      });
      fileUrl = blob.url;
    } catch (uploadError) {
      console.error("File upload error:", uploadError);
      // If blob storage isn't configured, store a placeholder
      // In production, you'd want to properly configure storage
      fileUrl = `placeholder://resumes/${session.user.id}/${file.name}`;
    }

    // Check if user already has a resume
    const existingResume = await prisma.resume.findUnique({
      where: { userId: session.user.id },
    });

    // Upsert resume record
    const resume = await prisma.resume.upsert({
      where: { userId: session.user.id },
      update: {
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        extractedText: parseResult.text,
        skills: parseResult.skills,
        // Reset comparison scores when uploading new resume
        uniquenessScore: null,
        similarCount90: null,
        similarCount80: null,
        lastAnalyzedAt: null,
      },
      create: {
        userId: session.user.id,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        extractedText: parseResult.text,
        skills: parseResult.skills,
        allowComparison: false,
      },
    });

    return NextResponse.json({
      success: true,
      resume: {
        id: resume.id,
        fileName: resume.fileName,
        skills: resume.skills,
        wordCount: parseResult.wordCount,
        pageCount: parseResult.pageCount,
        allowComparison: resume.allowComparison,
      },
    });
  } catch (error) {
    console.error("Resume upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload resume" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resume = await prisma.resume.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileSize: true,
        skills: true,
        allowComparison: true,
        comparisonOptInAt: true,
        uniquenessScore: true,
        similarCount90: true,
        similarCount80: true,
        lastAnalyzedAt: true,
        uploadedAt: true,
        updatedAt: true,
      },
    });

    if (!resume) {
      return NextResponse.json({ resume: null });
    }

    return NextResponse.json({ resume });
  } catch (error) {
    console.error("Resume fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch resume" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.resume.delete({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resume delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete resume" },
      { status: 500 }
    );
  }
}
