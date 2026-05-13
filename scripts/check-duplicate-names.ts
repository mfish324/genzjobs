import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const rows: any[] = await prisma.$queryRaw`
    SELECT "atsPlatform", LOWER("companyName") as name, COUNT(*)::int as n
    FROM company_ats GROUP BY 1, 2 HAVING COUNT(*) > 1
  `;
  console.log(`Duplicate (platform, lower(name)) pairs: ${rows.length}`);
  if (rows.length) console.log(JSON.stringify(rows, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
