import './env';
import { Db } from './db';
import { fixtures } from './fixtures';
async function seed() {
  if (process.env.NODE_ENV === 'production') throw new Error('Development fixtures must not be seeded in production.');
  const db = new Db();
  try { for (const { slug, ...version } of fixtures) await db.meal.upsert({ where: { slug }, update: {}, create: { slug, versions: { create: version } } }); console.log(`Seeded ${fixtures.length} development meal fixtures.`); }
  finally { await db.$disconnect(); }
}
seed().catch(e => { console.error(e.message); process.exitCode = 1; });
