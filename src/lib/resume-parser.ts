// @ts-ignore - pdf-parse has module issues
import pdfParse from "pdf-parse";

// Common tech skills to look for in resumes
const COMMON_SKILLS = [
  // Programming Languages
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Ruby", "Go", "Rust", "PHP", "Swift", "Kotlin", "Scala", "R",
  // Frontend
  "React", "Vue", "Angular", "Next.js", "Svelte", "HTML", "CSS", "SASS", "Tailwind", "Bootstrap", "jQuery",
  // Backend
  "Node.js", "Express", "Django", "Flask", "Spring", "Rails", "FastAPI", "NestJS", "GraphQL", "REST API",
  // Databases
  "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Firebase", "DynamoDB", "Oracle", "SQLite",
  // Cloud & DevOps
  "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "Jenkins", "GitHub Actions", "Terraform", "Ansible",
  // Data & ML
  "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Pandas", "NumPy", "Scikit-learn", "Data Analysis",
  // Tools
  "Git", "Linux", "Bash", "VS Code", "Jira", "Figma", "Agile", "Scrum",
  // Other
  "API", "Microservices", "Unit Testing", "Integration Testing", "Technical Writing", "Problem Solving",
];

export interface ResumeParseResult {
  text: string;
  skills: string[];
  wordCount: number;
  pageCount?: number;
}

export async function parseResume(
  buffer: Buffer,
  mimeType: string
): Promise<ResumeParseResult> {
  let text = "";
  let pageCount: number | undefined;

  if (mimeType === "application/pdf") {
    const pdfData = await pdfParse(buffer);
    text = pdfData.text;
    pageCount = pdfData.numpages;
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    // For DOCX files, we'll do basic text extraction
    // In production, you might want to use mammoth or similar
    text = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r]/g, " ");
  } else {
    throw new Error("Unsupported file type");
  }

  // Clean up text
  text = text
    .replace(/\s+/g, " ")
    .replace(/[^\w\s.,;:!?@#$%^&*()\-+=[\]{}|\\/<>"'`~]/g, "")
    .trim();

  // Extract skills
  const skills = extractSkills(text);

  return {
    text,
    skills,
    wordCount: text.split(/\s+/).length,
    pageCount,
  };
}

function extractSkills(text: string): string[] {
  const textLower = text.toLowerCase();
  const foundSkills: string[] = [];

  for (const skill of COMMON_SKILLS) {
    // Create variations for matching
    const skillLower = skill.toLowerCase();
    const skillVariations = [
      skillLower,
      skillLower.replace(/\./g, ""), // nodejs -> nodejs
      skillLower.replace(/\s+/g, ""), // next.js -> nextjs
      skillLower.replace(/-/g, " "), // ci-cd -> ci cd
    ];

    // Check if any variation is found in text
    const found = skillVariations.some(
      (variant) =>
        textLower.includes(` ${variant} `) ||
        textLower.includes(`${variant},`) ||
        textLower.includes(`${variant}.`) ||
        textLower.startsWith(`${variant} `) ||
        textLower.endsWith(` ${variant}`) ||
        // Word boundary match for more accuracy
        new RegExp(`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(textLower)
    );

    if (found && !foundSkills.includes(skill)) {
      foundSkills.push(skill);
    }
  }

  return foundSkills;
}

export function validateResumeFile(
  file: { size: number; type: string; name: string }
): { valid: boolean; error?: string } {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ];
  const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc"];

  if (file.size > MAX_SIZE) {
    return { valid: false, error: "File size must be less than 5MB" };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    const extension = file.name.toLowerCase().split(".").pop();
    if (!ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      return { valid: false, error: "Only PDF and Word documents are allowed" };
    }
  }

  return { valid: true };
}
