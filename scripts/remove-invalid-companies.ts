import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const invalidSlugs = [
  // Greenhouse - not found
  'notion', 'ramp', 'linear', 'retool', 'replit', 'plaid', 'hashicorp', 'miro',
  'segment', 'gem', 'gong', 'openai', 'cohere', 'huggingface', 'wandb', 'character',
  'pinecone', 'anyscale', 'shopify', 'doordash', 'warbyparker', 'ro', 'tempus',
  'snowflake', 'confluent', 'snyk',
  // Lever - not found
  'twitch', 'reddit', 'pinterest', 'lyft', 'uber', 'snap', 'twitter', 'dropbox',
  'zoom', 'slack', 'squarespace', 'mailchimp', 'hubspot', 'intercom', 'calendly',
  'zapier', 'cloudflare', 'digitalocean', 'postman', 'auth0', 'circleci'
];

async function main() {
  const result = await prisma.companyATS.deleteMany({
    where: { slug: { in: invalidSlugs } }
  });
  console.log(`Deleted ${result.count} invalid companies`);

  const remaining = await prisma.companyATS.count();
  console.log(`Remaining companies: ${remaining}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
