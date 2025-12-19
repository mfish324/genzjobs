import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const resources = [
  // Resume Building
  {
    title: "Harvard Resume & Cover Letter Guide",
    description: "Free comprehensive guide from Harvard's Office of Career Services on crafting effective resumes and cover letters.",
    type: "article",
    url: "https://careerservices.fas.harvard.edu/resources/resume-cover-letter-resources/",
    whyItMatters: "Harvard's career advice is used by top employers to evaluate candidates. This free guide gives you insider knowledge.",
    tags: ["resume", "cover letter", "free"],
    category: "resume",
    isFeatured: true,
  },
  {
    title: "Canva Resume Templates",
    description: "Free, modern resume templates you can customize online. Great for creative and traditional roles.",
    type: "tool",
    url: "https://www.canva.com/resumes/templates/",
    whyItMatters: "A visually appealing resume gets noticed. Canva makes it easy to stand out without design skills.",
    tags: ["resume", "templates", "free", "design"],
    category: "resume",
    isFeatured: false,
  },
  {
    title: "Resume Worded - Free ATS Scanner",
    description: "Check if your resume will pass Applicant Tracking Systems (ATS) that filter out 75% of applications.",
    type: "tool",
    url: "https://resumeworded.com/",
    whyItMatters: "Most companies use ATS software. If your resume isn't optimized, humans may never see it.",
    tags: ["resume", "ATS", "scanner", "free"],
    category: "resume",
    isFeatured: true,
  },
  {
    title: "Google's Resume Tips Video",
    description: "Google recruiters share what they look for in resumes and common mistakes to avoid.",
    type: "video",
    url: "https://www.youtube.com/watch?v=BYUy1yvjHxE",
    whyItMatters: "Advice straight from recruiters at one of the most competitive companies in the world.",
    tags: ["resume", "google", "recruiter tips"],
    category: "resume",
    isFeatured: false,
  },

  // Interview Prep
  {
    title: "Big Interview - Free Practice",
    description: "AI-powered mock interview practice with feedback. Practice common questions before the real thing.",
    type: "tool",
    url: "https://biginterview.com/",
    whyItMatters: "Practice makes perfect. Mock interviews reduce anxiety and help you nail your delivery.",
    tags: ["interview", "practice", "AI", "mock interview"],
    category: "interview",
    isFeatured: true,
  },
  {
    title: "Glassdoor Interview Questions",
    description: "Real interview questions shared by candidates who interviewed at thousands of companies.",
    type: "tool",
    url: "https://www.glassdoor.com/Interview/index.htm",
    whyItMatters: "Know exactly what questions to expect at your target company before you walk in.",
    tags: ["interview", "questions", "company research"],
    category: "interview",
    isFeatured: false,
  },
  {
    title: "The STAR Method Explained",
    description: "Master the STAR method (Situation, Task, Action, Result) for behavioral interview questions.",
    type: "article",
    url: "https://www.themuse.com/advice/star-interview-method",
    whyItMatters: "Behavioral questions are in almost every interview. STAR helps you tell compelling stories.",
    tags: ["interview", "STAR method", "behavioral"],
    category: "interview",
    isFeatured: false,
  },
  {
    title: "Pramp - Free Mock Interviews",
    description: "Practice technical and behavioral interviews with peers for free. Great for tech roles.",
    type: "tool",
    url: "https://www.pramp.com/",
    whyItMatters: "Free peer practice with real people. Get comfortable with the interview format.",
    tags: ["interview", "practice", "free", "tech"],
    category: "interview",
    isFeatured: false,
  },

  // Networking
  {
    title: "LinkedIn Learning - Networking Foundations",
    description: "Learn how to build genuine professional relationships that advance your career.",
    type: "course",
    url: "https://www.linkedin.com/learning/topics/networking",
    whyItMatters: "80% of jobs are filled through networking. Learn to do it authentically.",
    tags: ["networking", "LinkedIn", "relationships"],
    category: "networking",
    isFeatured: true,
  },
  {
    title: "How to Write a Cold Email That Gets Responses",
    description: "Templates and strategies for reaching out to professionals you don't know yet.",
    type: "article",
    url: "https://www.themuse.com/advice/how-to-cold-email-someone-for-a-job",
    whyItMatters: "Cold outreach works when done right. Learn the formula that gets replies.",
    tags: ["networking", "cold email", "outreach"],
    category: "networking",
    isFeatured: false,
  },
  {
    title: "The 2-Hour Job Search Method",
    description: "Book summary and key tactics from Steve Dalton's proven job search methodology.",
    type: "article",
    url: "https://www.sloww.co/2-hour-job-search/",
    whyItMatters: "A systematic approach to job searching that's more effective than applying online.",
    tags: ["job search", "networking", "strategy"],
    category: "networking",
    isFeatured: false,
  },

  // Skill Development
  {
    title: "freeCodeCamp",
    description: "Free coding bootcamp with certifications. Learn web development, Python, data science, and more.",
    type: "course",
    url: "https://www.freecodecamp.org/",
    whyItMatters: "Tech skills are in demand across industries. Learn to code for free with real projects.",
    tags: ["coding", "free", "certifications", "tech"],
    category: "skills",
    isFeatured: true,
  },
  {
    title: "Google Career Certificates",
    description: "Professional certificates in IT, Data Analytics, UX Design, and Project Management. No degree required.",
    type: "course",
    url: "https://grow.google/certificates/",
    whyItMatters: "Google-backed certificates recognized by top employers. Can be completed in 3-6 months.",
    tags: ["certifications", "google", "career change"],
    category: "skills",
    isFeatured: true,
  },
  {
    title: "Coursera - Free Courses",
    description: "Audit thousands of courses from top universities for free. Pay only if you want a certificate.",
    type: "course",
    url: "https://www.coursera.org/",
    whyItMatters: "Learn from Yale, Stanford, and Google without the tuition. Boost your resume with new skills.",
    tags: ["courses", "free", "universities"],
    category: "skills",
    isFeatured: false,
  },
  {
    title: "Khan Academy",
    description: "Free courses in math, economics, computing, and more. Great for building foundational skills.",
    type: "course",
    url: "https://www.khanacademy.org/",
    whyItMatters: "Fill skill gaps for free. Strong foundations help you learn advanced topics faster.",
    tags: ["free", "education", "fundamentals"],
    category: "skills",
    isFeatured: false,
  },
  {
    title: "Excel Skills for Business (Coursera)",
    description: "Master Excel from beginner to advanced. Essential for almost any office job.",
    type: "course",
    url: "https://www.coursera.org/specializations/excel",
    whyItMatters: "Excel proficiency is listed in 80% of job postings. It's a must-have skill.",
    tags: ["excel", "business", "essential skills"],
    category: "skills",
    isFeatured: false,
  },

  // Career Mindset
  {
    title: "The Tim Ferriss Show - Career Episodes",
    description: "World-class performers share their strategies for success, productivity, and career growth.",
    type: "podcast",
    url: "https://tim.blog/podcast/",
    whyItMatters: "Learn from billionaires, athletes, and leaders. Actionable advice you can apply today.",
    tags: ["podcast", "success", "productivity"],
    category: "mindset",
    isFeatured: false,
  },
  {
    title: "How I Built This with Guy Raz",
    description: "Stories behind the world's best-known companies. Inspiring for aspiring entrepreneurs.",
    type: "podcast",
    url: "https://www.npr.org/podcasts/510313/how-i-built-this",
    whyItMatters: "Understand how successful people think. Their failures are as instructive as their wins.",
    tags: ["podcast", "entrepreneurship", "inspiration"],
    category: "mindset",
    isFeatured: true,
  },
  {
    title: "Atomic Habits Summary",
    description: "Key lessons from James Clear's bestseller on building good habits and breaking bad ones.",
    type: "article",
    url: "https://jamesclear.com/atomic-habits-summary",
    whyItMatters: "Small habits compound. Build the routines that lead to career success.",
    tags: ["habits", "productivity", "self-improvement"],
    category: "mindset",
    isFeatured: false,
  },
  {
    title: "Designing Your Life",
    description: "Stanford course on applying design thinking to build a fulfilling career and life.",
    type: "course",
    url: "https://designingyour.life/",
    whyItMatters: "Don't just find a job—design a career you love using proven frameworks.",
    tags: ["career planning", "design thinking", "life design"],
    category: "mindset",
    isFeatured: false,
  },
  {
    title: "The Subtle Art of Not Giving a F*ck - Summary",
    description: "Key insights on focusing on what truly matters in your career and life.",
    type: "article",
    url: "https://www.samuelthomasdavies.com/book-summaries/self-help/the-subtle-art-of-not-giving-a-fck/",
    whyItMatters: "Reduce career anxiety by focusing on values, not validation. Practical and refreshing.",
    tags: ["mindset", "values", "anxiety"],
    category: "mindset",
    isFeatured: false,
  },

  // Additional Tools
  {
    title: "Notion - Free for Students",
    description: "All-in-one workspace for notes, tasks, and job search tracking. Free for students.",
    type: "tool",
    url: "https://www.notion.so/students",
    whyItMatters: "Stay organized during your job search. Track applications, prep notes, and deadlines.",
    tags: ["organization", "free", "productivity"],
    category: "skills",
    isFeatured: false,
  },
  {
    title: "Huntr - Job Search Tracker",
    description: "Free tool to organize your job search. Track applications, contacts, and interview stages.",
    type: "tool",
    url: "https://huntr.co/",
    whyItMatters: "Applying to dozens of jobs? Stay organized and never miss a follow-up.",
    tags: ["job search", "organization", "tracking"],
    category: "skills",
    isFeatured: false,
  },
];

async function main() {
  console.log("Seeding resources...");

  for (const resource of resources) {
    await prisma.resource.upsert({
      where: {
        // Use title + url as a unique identifier
        id: resource.title.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 50),
      },
      update: resource,
      create: {
        id: resource.title.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 50),
        ...resource,
      },
    });
    console.log(`  Added: ${resource.title}`);
  }

  console.log(`\nSeeded ${resources.length} resources!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
