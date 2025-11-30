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
