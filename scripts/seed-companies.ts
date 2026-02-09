/**
 * Seed Companies for ATS Scrapers
 *
 * Populates the CompanyATS table with Greenhouse and Lever companies.
 *
 * Usage:
 *   npx tsx scripts/seed-companies.ts              # Seed all companies
 *   npx tsx scripts/seed-companies.ts --validate   # Validate URLs before inserting
 */

import { PrismaClient, ATSPlatform } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ==================== Company Data ====================

interface CompanyData {
  companyName: string;
  atsPlatform: ATSPlatform;
  slug: string;
  boardUrl?: string;
}

const GREENHOUSE_COMPANIES: CompanyData[] = [
  // Tech Giants & Major Tech
  { companyName: 'Stripe', atsPlatform: 'GREENHOUSE', slug: 'stripe' },
  { companyName: 'Airbnb', atsPlatform: 'GREENHOUSE', slug: 'airbnb' },
  { companyName: 'Discord', atsPlatform: 'GREENHOUSE', slug: 'discord' },
  { companyName: 'Figma', atsPlatform: 'GREENHOUSE', slug: 'figma' },
  { companyName: 'Notion', atsPlatform: 'GREENHOUSE', slug: 'notion' },
  { companyName: 'Ramp', atsPlatform: 'GREENHOUSE', slug: 'ramp' },
  { companyName: 'Vercel', atsPlatform: 'GREENHOUSE', slug: 'vercel' },
  { companyName: 'Linear', atsPlatform: 'GREENHOUSE', slug: 'linear' },
  { companyName: 'Retool', atsPlatform: 'GREENHOUSE', slug: 'retool' },
  { companyName: 'Scale AI', atsPlatform: 'GREENHOUSE', slug: 'scaleai' },
  { companyName: 'Replit', atsPlatform: 'GREENHOUSE', slug: 'replit' },
  { companyName: 'Webflow', atsPlatform: 'GREENHOUSE', slug: 'webflow' },
  { companyName: 'Flexport', atsPlatform: 'GREENHOUSE', slug: 'flexport' },
  { companyName: 'Brex', atsPlatform: 'GREENHOUSE', slug: 'brex' },
  { companyName: 'Mercury', atsPlatform: 'GREENHOUSE', slug: 'mercury' },
  { companyName: 'Plaid', atsPlatform: 'GREENHOUSE', slug: 'plaid' },
  { companyName: 'Databricks', atsPlatform: 'GREENHOUSE', slug: 'databricks' },
  { companyName: 'HashiCorp', atsPlatform: 'GREENHOUSE', slug: 'hashicorp' },
  { companyName: 'Airtable', atsPlatform: 'GREENHOUSE', slug: 'airtable' },
  { companyName: 'Miro', atsPlatform: 'GREENHOUSE', slug: 'miro' },
  { companyName: 'Segment', atsPlatform: 'GREENHOUSE', slug: 'segment' },
  { companyName: 'Amplitude', atsPlatform: 'GREENHOUSE', slug: 'amplitude' },
  { companyName: 'LaunchDarkly', atsPlatform: 'GREENHOUSE', slug: 'launchdarkly' },
  { companyName: 'PagerDuty', atsPlatform: 'GREENHOUSE', slug: 'pagerduty' },
  { companyName: 'Asana', atsPlatform: 'GREENHOUSE', slug: 'asana' },
  { companyName: 'Gusto', atsPlatform: 'GREENHOUSE', slug: 'gusto' },
  { companyName: 'Lattice', atsPlatform: 'GREENHOUSE', slug: 'lattice' },
  { companyName: 'Gem', atsPlatform: 'GREENHOUSE', slug: 'gem' },
  { companyName: 'Gong', atsPlatform: 'GREENHOUSE', slug: 'gong' },
  { companyName: 'Hightouch', atsPlatform: 'GREENHOUSE', slug: 'hightouch' },

  // AI/ML Companies
  { companyName: 'Anthropic', atsPlatform: 'GREENHOUSE', slug: 'anthropic' },
  { companyName: 'OpenAI', atsPlatform: 'GREENHOUSE', slug: 'openai' },
  { companyName: 'Cohere', atsPlatform: 'GREENHOUSE', slug: 'cohere' },
  { companyName: 'Hugging Face', atsPlatform: 'GREENHOUSE', slug: 'huggingface' },
  { companyName: 'Weights & Biases', atsPlatform: 'GREENHOUSE', slug: 'wandb' },
  { companyName: 'Runway', atsPlatform: 'GREENHOUSE', slug: 'runwayml' },
  { companyName: 'Character.ai', atsPlatform: 'GREENHOUSE', slug: 'character' },
  { companyName: 'Stability AI', atsPlatform: 'GREENHOUSE', slug: 'stabilityai' },
  { companyName: 'Pinecone', atsPlatform: 'GREENHOUSE', slug: 'pinecone' },
  { companyName: 'Anyscale', atsPlatform: 'GREENHOUSE', slug: 'anyscale' },

  // Fintech
  { companyName: 'Chime', atsPlatform: 'GREENHOUSE', slug: 'chime' },
  { companyName: 'Robinhood', atsPlatform: 'GREENHOUSE', slug: 'robinhood' },
  { companyName: 'SoFi', atsPlatform: 'GREENHOUSE', slug: 'sofi' },
  { companyName: 'Affirm', atsPlatform: 'GREENHOUSE', slug: 'affirm' },
  { companyName: 'Coinbase', atsPlatform: 'GREENHOUSE', slug: 'coinbase' },
  { companyName: 'Carta', atsPlatform: 'GREENHOUSE', slug: 'carta' },
  { companyName: 'Marqeta', atsPlatform: 'GREENHOUSE', slug: 'marqeta' },

  // E-commerce & Consumer
  { companyName: 'Shopify', atsPlatform: 'GREENHOUSE', slug: 'shopify' },
  { companyName: 'Instacart', atsPlatform: 'GREENHOUSE', slug: 'instacart' },
  { companyName: 'DoorDash', atsPlatform: 'GREENHOUSE', slug: 'doordash' },
  { companyName: 'Warby Parker', atsPlatform: 'GREENHOUSE', slug: 'warbyparker' },
  { companyName: 'Glossier', atsPlatform: 'GREENHOUSE', slug: 'glossier' },
  { companyName: 'Allbirds', atsPlatform: 'GREENHOUSE', slug: 'allbirds' },

  // Health & Biotech
  { companyName: 'Oscar Health', atsPlatform: 'GREENHOUSE', slug: 'oscar' },
  { companyName: 'Ro', atsPlatform: 'GREENHOUSE', slug: 'ro' },
  { companyName: 'Tempus', atsPlatform: 'GREENHOUSE', slug: 'tempus' },
  { companyName: 'Cerebral', atsPlatform: 'GREENHOUSE', slug: 'cerebral' },

  // Enterprise & B2B
  { companyName: 'MongoDB', atsPlatform: 'GREENHOUSE', slug: 'mongodb' },
  { companyName: 'Snowflake', atsPlatform: 'GREENHOUSE', slug: 'snowflake' },
  { companyName: 'Confluent', atsPlatform: 'GREENHOUSE', slug: 'confluent' },
  { companyName: 'GitLab', atsPlatform: 'GREENHOUSE', slug: 'gitlab' },
  { companyName: 'Datadog', atsPlatform: 'GREENHOUSE', slug: 'datadog' },
  { companyName: 'Snyk', atsPlatform: 'GREENHOUSE', slug: 'snyk' },
];

const WORKDAY_COMPANIES: CompanyData[] = [
  // Format: tenant.server.site
  // Large Enterprise Companies
  { companyName: 'Salesforce', atsPlatform: 'WORKDAY', slug: 'salesforce.wd12.External_Career_Site' },
  { companyName: 'IBM', atsPlatform: 'WORKDAY', slug: 'ibm.wd1.IBM_Careers' },
  { companyName: 'Walmart', atsPlatform: 'WORKDAY', slug: 'walmart.wd5.WalmartExternal' },
  { companyName: 'Target', atsPlatform: 'WORKDAY', slug: 'target.wd5.targetcareers' },
  { companyName: 'Bank of America', atsPlatform: 'WORKDAY', slug: 'bankofamerica.wd1.BofAExternal' },
  { companyName: 'Capital One', atsPlatform: 'WORKDAY', slug: 'capitalone.wd12.Capital_One' },
  { companyName: 'JPMorgan Chase', atsPlatform: 'WORKDAY', slug: 'jpmorganchase.wd5.JPMorganChaseExternal' },
  { companyName: 'Deloitte', atsPlatform: 'WORKDAY', slug: 'deloitte.wd1.GlobalCareers' },
  { companyName: 'Accenture', atsPlatform: 'WORKDAY', slug: 'accenture.wd3.AccentureCareers' },
  { companyName: 'EY', atsPlatform: 'WORKDAY', slug: 'ey.wd5.EY_Careers' },
  { companyName: 'PwC', atsPlatform: 'WORKDAY', slug: 'pwc.wd3.PWC_Careers' },
  { companyName: 'KPMG', atsPlatform: 'WORKDAY', slug: 'kpmgus.wd5.KPMG_Careers' },
  { companyName: 'Adobe', atsPlatform: 'WORKDAY', slug: 'adobe.wd5.external_experienced' },
  { companyName: 'ServiceNow', atsPlatform: 'WORKDAY', slug: 'servicenow.wd1.External' },
  { companyName: 'Workday', atsPlatform: 'WORKDAY', slug: 'workday.wd5.Workday' },
];

const WORKABLE_COMPANIES: CompanyData[] = [
  // Tech & Startups
  { companyName: 'Rokt', atsPlatform: 'WORKABLE', slug: 'rokt' },
  { companyName: 'GroundTruth', atsPlatform: 'WORKABLE', slug: 'groundtruth' },
  { companyName: 'NeoWork', atsPlatform: 'WORKABLE', slug: 'neowork' },
  { companyName: 'BizForce', atsPlatform: 'WORKABLE', slug: 'bizforcenow' },
  { companyName: 'Workable', atsPlatform: 'WORKABLE', slug: 'workable' },
  { companyName: 'First Analysis', atsPlatform: 'WORKABLE', slug: 'first-analysis' },
  { companyName: 'Rational 360', atsPlatform: 'WORKABLE', slug: 'rational-360' },
  { companyName: 'grape', atsPlatform: 'WORKABLE', slug: 'grape' },
  { companyName: 'Middlebury College', atsPlatform: 'WORKABLE', slug: 'middleburycollege' },
  { companyName: 'Boutique Group', atsPlatform: 'WORKABLE', slug: 'boutique-group' },
];

const LEVER_COMPANIES: CompanyData[] = [
  // Tech Companies
  { companyName: 'Netflix', atsPlatform: 'LEVER', slug: 'netflix' },
  { companyName: 'Spotify', atsPlatform: 'LEVER', slug: 'spotify' },
  { companyName: 'Twitch', atsPlatform: 'LEVER', slug: 'twitch' },
  { companyName: 'Reddit', atsPlatform: 'LEVER', slug: 'reddit' },
  { companyName: 'Pinterest', atsPlatform: 'LEVER', slug: 'pinterest' },
  { companyName: 'Lyft', atsPlatform: 'LEVER', slug: 'lyft' },
  { companyName: 'Uber', atsPlatform: 'LEVER', slug: 'uber' },
  { companyName: 'Snap', atsPlatform: 'LEVER', slug: 'snap' },
  { companyName: 'Twitter', atsPlatform: 'LEVER', slug: 'twitter' },
  { companyName: 'Dropbox', atsPlatform: 'LEVER', slug: 'dropbox' },
  { companyName: 'Zoom', atsPlatform: 'LEVER', slug: 'zoom' },
  { companyName: 'Slack', atsPlatform: 'LEVER', slug: 'slack' },
  { companyName: 'Squarespace', atsPlatform: 'LEVER', slug: 'squarespace' },
  { companyName: 'Mailchimp', atsPlatform: 'LEVER', slug: 'mailchimp' },
  { companyName: 'HubSpot', atsPlatform: 'LEVER', slug: 'hubspot' },
  { companyName: 'Intercom', atsPlatform: 'LEVER', slug: 'intercom' },
  { companyName: 'Calendly', atsPlatform: 'LEVER', slug: 'calendly' },
  { companyName: 'Zapier', atsPlatform: 'LEVER', slug: 'zapier' },
  { companyName: 'Cloudflare', atsPlatform: 'LEVER', slug: 'cloudflare' },
  { companyName: 'DigitalOcean', atsPlatform: 'LEVER', slug: 'digitalocean' },
  { companyName: 'Postman', atsPlatform: 'LEVER', slug: 'postman' },
  { companyName: 'Auth0', atsPlatform: 'LEVER', slug: 'auth0' },
  { companyName: 'CircleCI', atsPlatform: 'LEVER', slug: 'circleci' },
  { companyName: 'JetBrains', atsPlatform: 'LEVER', slug: 'jetbrains' },
];

const RECRUITEE_COMPANIES: CompanyData[] = [
  // European Tech & Fintech
  { companyName: 'bunq', atsPlatform: 'RECRUITEE', slug: 'bunq' },
  { companyName: 'Personio', atsPlatform: 'RECRUITEE', slug: 'personio' },
  { companyName: 'Applied Value', atsPlatform: 'RECRUITEE', slug: 'appliedvalue' },
  { companyName: 'Flink', atsPlatform: 'RECRUITEE', slug: 'flink' },
  { companyName: 'Tellent', atsPlatform: 'RECRUITEE', slug: 'tellent' },
];

const ALL_COMPANIES = [...GREENHOUSE_COMPANIES, ...LEVER_COMPANIES, ...WORKDAY_COMPANIES, ...WORKABLE_COMPANIES, ...RECRUITEE_COMPANIES];

// ==================== Validation ====================

async function validateBoard(company: CompanyData): Promise<boolean> {
  let url: string;
  let method: 'HEAD' | 'POST' | 'GET' = 'HEAD';
  let body: string | undefined;
  let headers: Record<string, string> = { 'User-Agent': 'GenzJobs/1.0' };

  if (company.atsPlatform === 'GREENHOUSE') {
    url = `https://boards-api.greenhouse.io/v1/boards/${company.slug}`;
  } else if (company.atsPlatform === 'LEVER') {
    url = `https://api.lever.co/v0/postings/${company.slug}?mode=json`;
  } else if (company.atsPlatform === 'ASHBY') {
    url = `https://api.ashbyhq.com/posting-api/job-board/${company.slug}`;
  } else if (company.atsPlatform === 'SMARTRECRUITERS') {
    url = `https://api.smartrecruiters.com/v1/companies/${company.slug}/postings?limit=1`;
  } else if (company.atsPlatform === 'WORKDAY') {
    // Workday requires POST to validate
    const parts = company.slug.split('.');
    if (parts.length !== 3) return false;
    const [tenant, server, site] = parts;
    url = `https://${tenant}.${server}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;
    method = 'POST';
    headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'GenzJobs/1.0',
    };
    body = JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0 });
  } else if (company.atsPlatform === 'WORKABLE') {
    // Workable widget API doesn't support HEAD, use GET
    url = `https://apply.workable.com/api/v1/widget/accounts/${company.slug}`;
    method = 'GET';
  } else if (company.atsPlatform === 'RECRUITEE') {
    url = `https://${company.slug}.recruitee.com/api/offers`;
  } else {
    return false;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      redirect: 'follow',
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ==================== Main ====================

async function main() {
  const args = process.argv.slice(2);
  const shouldValidate = args.includes('--validate');
  const onlyPlatform = args.find(a => a.startsWith('--platform='))?.split('=')[1]?.toUpperCase() as ATSPlatform | undefined;

  let companies = ALL_COMPANIES;
  if (onlyPlatform) {
    companies = companies.filter(c => c.atsPlatform === onlyPlatform);
  }

  console.log(`Seeding ${companies.length} companies...`);
  if (shouldValidate) {
    console.log('(with URL validation - this will be slower)\n');
  }

  let added = 0;
  let skipped = 0;
  let invalid = 0;

  for (const company of companies) {
    // Optionally validate
    if (shouldValidate) {
      process.stdout.write(`  Validating ${company.companyName}... `);
      const isValid = await validateBoard(company);
      if (!isValid) {
        console.log('INVALID - skipped');
        invalid++;
        continue;
      }
      console.log('OK');
      // Rate limit validation requests
      await new Promise(r => setTimeout(r, 500));
    }

    try {
      await prisma.companyATS.upsert({
        where: {
          atsPlatform_slug: {
            atsPlatform: company.atsPlatform,
            slug: company.slug,
          },
        },
        update: {
          companyName: company.companyName,
          boardUrl: company.boardUrl,
        },
        create: {
          companyName: company.companyName,
          atsPlatform: company.atsPlatform,
          slug: company.slug,
          boardUrl: company.boardUrl,
        },
      });

      if (!shouldValidate) {
        console.log(`  Added: ${company.companyName} (${company.atsPlatform})`);
      }
      added++;
    } catch (error) {
      console.error(`  Error adding ${company.companyName}:`, error);
      skipped++;
    }
  }

  console.log(`\n==================== Summary ====================`);
  console.log(`Total: ${companies.length}`);
  console.log(`Added/Updated: ${added}`);
  if (invalid > 0) console.log(`Invalid (skipped): ${invalid}`);
  if (skipped > 0) console.log(`Errors: ${skipped}`);

  // Show counts by platform
  const countByPlatform = await prisma.companyATS.groupBy({
    by: ['atsPlatform'],
    _count: true,
  });

  console.log(`\n==================== By Platform ====================`);
  for (const row of countByPlatform) {
    console.log(`${row.atsPlatform}: ${row._count}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
