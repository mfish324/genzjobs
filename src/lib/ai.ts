import Anthropic from "@anthropic-ai/sdk";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export interface MatchResult {
  matchScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  strengths: string[];
  learningRecommendations: { skill: string; suggestion: string }[];
  summary: string;
}

export interface CompanySummary {
  overview: string;
  culture: string;
  growthOpportunities: string;
  whyYoullLoveIt: string;
}

export interface SimilarJobResult {
  job: {
    id: string;
    title: string;
    company: string;
    companyLogo: string | null;
    description: string;
    skills: string[];
    category: string | null;
    jobType: string | null;
    experienceLevel: string | null;
    location: string | null;
    remote: boolean;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string | null;
    salaryPeriod: string | null;
    postedAt: Date;
    applyUrl: string | null;
    publisher: string | null;
  };
  score: number;
  reasons: string[];
}

export async function analyzeJobMatch(
  userSkills: string[],
  userExperience: string | null,
  jobTitle: string,
  jobDescription: string,
  jobSkills: string[],
  jobExperienceLevel: string | null
): Promise<MatchResult | null> {
  if (!anthropic) {
    // Fallback basic matching
    return basicJobMatch(userSkills, jobSkills);
  }

  try {
    const prompt = `You are a career advisor helping Gen-Z job seekers find the perfect role. Analyze the match between this candidate and job.

CANDIDATE:
- Skills: ${userSkills.join(", ") || "Not specified"}
- Experience Level: ${userExperience || "Not specified"}

JOB:
- Title: ${jobTitle}
- Required Skills: ${jobSkills.join(", ") || "Not specified"}
- Experience Level: ${jobExperienceLevel || "Not specified"}
- Description: ${jobDescription.substring(0, 1500)}

Respond in JSON format with these exact fields:
{
  "matchScore": <number 0-100>,
  "matchingSkills": [<skills the candidate has that match the job>],
  "missingSkills": [<important skills the candidate should develop>],
  "strengths": [<2-3 strengths this candidate brings to the role>],
  "learningRecommendations": [{"skill": "<skill>", "suggestion": "<specific course or resource>"}],
  "summary": "<2-3 sentence Gen-Z friendly summary of the match>"
}`;

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type === "text") {
      // Extract JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as MatchResult;
      }
    }

    return basicJobMatch(userSkills, jobSkills);
  } catch (error) {
    console.error("AI job match error:", error);
    return basicJobMatch(userSkills, jobSkills);
  }
}

function basicJobMatch(userSkills: string[], jobSkills: string[]): MatchResult {
  const normalizedUserSkills = userSkills.map((s) => s.toLowerCase());
  const normalizedJobSkills = jobSkills.map((s) => s.toLowerCase());

  const matchingSkills = userSkills.filter((skill) =>
    normalizedJobSkills.some(
      (js) => js.includes(skill.toLowerCase()) || skill.toLowerCase().includes(js)
    )
  );

  const missingSkills = jobSkills.filter(
    (skill) =>
      !normalizedUserSkills.some(
        (us) => us.includes(skill.toLowerCase()) || skill.toLowerCase().includes(us)
      )
  );

  const matchScore = jobSkills.length > 0
    ? Math.round((matchingSkills.length / jobSkills.length) * 100)
    : 50;

  return {
    matchScore,
    matchingSkills,
    missingSkills: missingSkills.slice(0, 5),
    strengths: matchingSkills.length > 0
      ? [`Strong background in ${matchingSkills.slice(0, 2).join(" and ")}`]
      : ["Potential to learn quickly"],
    learningRecommendations: missingSkills.slice(0, 3).map((skill) => ({
      skill,
      suggestion: `Consider taking an online course in ${skill}`,
    })),
    summary: `You match ${matchScore}% of the required skills. ${
      matchScore >= 70
        ? "Great fit!"
        : matchScore >= 50
        ? "Worth applying with a strong cover letter."
        : "Consider developing some missing skills first."
    }`,
  };
}

export async function generateCompanySummary(
  companyName: string,
  website?: string,
  industry?: string
): Promise<CompanySummary | null> {
  if (!anthropic) {
    return null;
  }

  try {
    const prompt = `You are a career advisor helping Gen-Z job seekers learn about companies. Create a fun, engaging summary for ${companyName}.

Company Info:
- Name: ${companyName}
- Website: ${website || "Unknown"}
- Industry: ${industry || "Unknown"}

Respond in JSON format with these fields:
{
  "overview": "<What does this company do in simple, Gen-Z friendly terms - 2-3 sentences>",
  "culture": "<What's the work culture like - be specific and relatable>",
  "growthOpportunities": "<Career growth potential - be encouraging>",
  "whyYoullLoveIt": "<1-2 reasons a Gen-Z worker might love working here>"
}

Keep the tone casual, upbeat, and use language that resonates with 18-28 year olds. Avoid corporate jargon.`;

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type === "text") {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as CompanySummary;
      }
    }

    return null;
  } catch (error) {
    console.error("Company summary error:", error);
    return null;
  }
}

interface SourceJob {
  id: string;
  title: string;
  company: string;
  description: string;
  skills: string[];
  category: string | null;
  jobType: string | null;
  experienceLevel: string | null;
  location: string | null;
  remote: boolean;
}

interface CandidateJob {
  id: string;
  title: string;
  company: string;
  companyLogo: string | null;
  description: string;
  skills: string[];
  category: string | null;
  jobType: string | null;
  experienceLevel: string | null;
  location: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  postedAt: Date;
  applyUrl: string | null;
  publisher: string | null;
}

export async function findSimilarJobs(
  sourceJob: SourceJob,
  candidateJobs: CandidateJob[]
): Promise<SimilarJobResult[]> {
  // If no AI available, use basic similarity scoring
  if (!anthropic) {
    return basicSimilarityScoring(sourceJob, candidateJobs);
  }

  try {
    // Use AI to score similarity for top candidates
    // Process in batches to avoid token limits
    const batchSize = 10;
    const scoredJobs: SimilarJobResult[] = [];

    // First do basic scoring to prioritize candidates
    const basicScored = basicSimilarityScoring(sourceJob, candidateJobs);
    const topCandidates = basicScored.slice(0, 20);

    // Then use AI for more nuanced scoring on top candidates
    for (let i = 0; i < topCandidates.length; i += batchSize) {
      const batch = topCandidates.slice(i, i + batchSize);

      const prompt = `You are analyzing job similarity. Compare these jobs to a source job and rate their similarity.

SOURCE JOB:
- Title: ${sourceJob.title}
- Company: ${sourceJob.company}
- Skills: ${sourceJob.skills.join(", ") || "Not specified"}
- Category: ${sourceJob.category || "Not specified"}
- Job Type: ${sourceJob.jobType || "Not specified"}
- Remote: ${sourceJob.remote ? "Yes" : "No"}
- Description (first 500 chars): ${sourceJob.description.substring(0, 500)}

CANDIDATE JOBS:
${batch.map((item, idx) => `
[Job ${idx + 1}] ID: ${item.job.id}
- Title: ${item.job.title}
- Company: ${item.job.company}
- Skills: ${item.job.skills.join(", ") || "Not specified"}
- Category: ${item.job.category || "Not specified"}
- Job Type: ${item.job.jobType || "Not specified"}
- Remote: ${item.job.remote ? "Yes" : "No"}
- Description (first 300 chars): ${item.job.description.substring(0, 300)}
`).join("\n")}

For each candidate job, determine:
1. Similarity score (0-100): How similar is this job to the source in terms of role, required skills, and responsibilities?
2. Match reasons: 2-3 brief reasons why these jobs are similar

Respond in JSON format:
{
  "scores": [
    { "id": "<job_id>", "score": <number>, "reasons": ["reason1", "reason2"] }
  ]
}`;

      try {
        const response = await anthropic.messages.create({
          model: "claude-3-haiku-20240307",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }],
        });

        const content = response.content[0];
        if (content.type === "text") {
          const jsonMatch = content.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as {
              scores: { id: string; score: number; reasons: string[] }[];
            };

            for (const scoreResult of parsed.scores) {
              const originalJob = batch.find((b) => b.job.id === scoreResult.id);
              if (originalJob) {
                scoredJobs.push({
                  job: originalJob.job,
                  score: scoreResult.score,
                  reasons: scoreResult.reasons,
                });
              }
            }
          }
        }
      } catch (batchError) {
        console.error("AI batch scoring error:", batchError);
        // Fall back to basic scores for this batch
        scoredJobs.push(...batch);
      }
    }

    // Sort by score descending
    return scoredJobs.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error("AI similarity error:", error);
    return basicSimilarityScoring(sourceJob, candidateJobs);
  }
}

export interface ResumeUniquenessResult {
  uniquenessScore: number;
  similarCount90: number;
  similarCount80: number;
  percentileRank: number;
  tips: string[];
  strengths: string[];
}

interface ResumeData {
  text: string;
  skills: string[];
}

interface OtherResume {
  id: string;
  extractedText: string;
  skills: string[];
}

export async function analyzeResumeUniqueness(
  userResume: ResumeData,
  otherResumes: OtherResume[]
): Promise<ResumeUniquenessResult> {
  // Calculate similarity scores using basic scoring first
  const similarityScores: number[] = [];

  for (const other of otherResumes) {
    const score = calculateResumeSimilarity(userResume, other);
    similarityScores.push(score);
  }

  // Count highly similar resumes
  const similarCount90 = similarityScores.filter((s) => s >= 90).length;
  const similarCount80 = similarityScores.filter((s) => s >= 80).length;

  // Calculate uniqueness score (inverse of average similarity)
  const avgSimilarity = similarityScores.length > 0
    ? similarityScores.reduce((a, b) => a + b, 0) / similarityScores.length
    : 0;

  // Uniqueness is 100 - average similarity to others
  const uniquenessScore = Math.round(100 - avgSimilarity);

  // Calculate percentile rank (how many people you're more unique than)
  const lowerSimilarityCount = similarityScores.filter((s) => s > avgSimilarity).length;
  const percentileRank = Math.round((lowerSimilarityCount / Math.max(1, similarityScores.length)) * 100);

  // Generate tips and strengths
  let tips: string[] = [];
  let strengths: string[] = [];

  if (anthropic && otherResumes.length > 0) {
    try {
      const topSimilar = otherResumes
        .map((r, i) => ({ resume: r, score: similarityScores[i] }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      const prompt = `Analyze this resume compared to similar resumes and provide actionable advice.

USER'S RESUME SKILLS: ${userResume.skills.join(", ") || "Not extracted"}
USER'S RESUME TEXT (first 1000 chars): ${userResume.text.substring(0, 1000)}

SIMILAR RESUMES OVERVIEW:
- Average similarity to other resumes: ${avgSimilarity.toFixed(1)}%
- Number of highly similar (90%+) resumes: ${similarCount90}
- Number of moderately similar (80%+) resumes: ${similarCount80}
- Total resumes compared: ${otherResumes.length}

Respond in JSON format:
{
  "tips": ["<3-4 specific, actionable tips to make resume more unique>"],
  "strengths": ["<2-3 unique strengths or standout elements from the resume>"]
}

Focus on:
1. What makes this resume stand out or blend in
2. Specific skills or experiences to highlight
3. How to differentiate from common patterns`;

      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0];
      if (content.type === "text") {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as { tips: string[]; strengths: string[] };
          tips = parsed.tips || [];
          strengths = parsed.strengths || [];
        }
      }
    } catch (error) {
      console.error("AI analysis error:", error);
    }
  }

  // Fallback tips if AI fails
  if (tips.length === 0) {
    if (uniquenessScore >= 80) {
      tips = [
        "Your resume is already quite unique - keep highlighting specific achievements",
        "Consider adding quantifiable metrics to your accomplishments",
        "Include specific projects or portfolio links to stand out further",
      ];
      strengths = [
        "Distinctive skill combination",
        "Unique professional experience",
      ];
    } else if (uniquenessScore >= 60) {
      tips = [
        "Add more specific project examples with measurable outcomes",
        "Highlight unique skills or certifications that set you apart",
        "Consider adding a personal branding statement",
        "Include relevant side projects or volunteer work",
      ];
      strengths = [
        "Good skill coverage",
      ];
    } else {
      tips = [
        "Focus on specific achievements rather than generic responsibilities",
        "Add quantifiable results (e.g., 'Increased sales by 25%')",
        "Highlight any unique certifications or specialized training",
        "Include projects that demonstrate your unique approach",
        "Consider developing niche skills in high-demand areas",
      ];
      strengths = [
        "Solid foundational skills",
      ];
    }
  }

  return {
    uniquenessScore,
    similarCount90,
    similarCount80,
    percentileRank,
    tips,
    strengths,
  };
}

function calculateResumeSimilarity(
  resumeA: ResumeData,
  resumeB: OtherResume
): number {
  let score = 0;

  // Skill overlap (up to 60 points)
  const skillsA = resumeA.skills.map((s) => s.toLowerCase());
  const skillsB = resumeB.skills.map((s) => s.toLowerCase());

  const commonSkills = skillsA.filter((skill) =>
    skillsB.some((s) => s === skill || s.includes(skill) || skill.includes(s))
  );

  const totalSkills = new Set([...skillsA, ...skillsB]).size;
  if (totalSkills > 0) {
    score += Math.round((commonSkills.length / totalSkills) * 60);
  }

  // Text similarity using Jaccard index on words (up to 40 points)
  const wordsA = new Set(
    resumeA.text.toLowerCase().split(/\s+/).filter((w) => w.length > 4)
  );
  const wordsB = new Set(
    resumeB.extractedText.toLowerCase().split(/\s+/).filter((w) => w.length > 4)
  );

  const intersection = Array.from(wordsA).filter((w) => wordsB.has(w)).length;
  const union = new Set([...Array.from(wordsA), ...Array.from(wordsB)]).size;

  if (union > 0) {
    score += Math.round((intersection / union) * 40);
  }

  return Math.min(100, score);
}

function basicSimilarityScoring(
  sourceJob: SourceJob,
  candidateJobs: CandidateJob[]
): SimilarJobResult[] {
  const normalizedSourceSkills = sourceJob.skills.map((s) => s.toLowerCase());
  const sourceTitle = sourceJob.title.toLowerCase();
  const sourceWords = sourceTitle.split(/\s+/).filter((w) => w.length > 3);

  return candidateJobs.map((candidate) => {
    let score = 0;
    const reasons: string[] = [];

    // Category match (20 points)
    if (sourceJob.category && candidate.category === sourceJob.category) {
      score += 20;
      reasons.push(`Same category: ${candidate.category}`);
    }

    // Skill overlap (up to 40 points)
    const normalizedCandidateSkills = candidate.skills.map((s) => s.toLowerCase());
    const overlappingSkills = normalizedSourceSkills.filter((skill) =>
      normalizedCandidateSkills.some(
        (cs) => cs.includes(skill) || skill.includes(cs)
      )
    );
    if (overlappingSkills.length > 0) {
      const skillScore = Math.min(40, overlappingSkills.length * 10);
      score += skillScore;
      reasons.push(`${overlappingSkills.length} matching skills`);
    }

    // Job type match (10 points)
    if (sourceJob.jobType && candidate.jobType === sourceJob.jobType) {
      score += 10;
    }

    // Experience level match (10 points)
    if (sourceJob.experienceLevel && candidate.experienceLevel === sourceJob.experienceLevel) {
      score += 10;
    }

    // Remote match (5 points)
    if (sourceJob.remote === candidate.remote) {
      score += 5;
    }

    // Title similarity (up to 15 points)
    const candidateTitle = candidate.title.toLowerCase();
    const candidateWords = candidateTitle.split(/\s+/).filter((w) => w.length > 3);
    const titleOverlap = sourceWords.filter((word) =>
      candidateWords.some((cw) => cw.includes(word) || word.includes(cw))
    ).length;
    if (titleOverlap > 0) {
      const titleScore = Math.min(15, titleOverlap * 5);
      score += titleScore;
      if (titleOverlap >= 2) {
        reasons.push("Similar job title");
      }
    }

    // Cap at 100
    score = Math.min(100, score);

    if (reasons.length === 0) {
      reasons.push("Potentially related role");
    }

    return {
      job: candidate,
      score,
      reasons,
    };
  }).sort((a, b) => b.score - a.score);
}
