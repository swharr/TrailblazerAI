import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();

  try {
    // First, clear any existing demo analyses
    await client.query('UPDATE "TrailAnalysis" SET "isDemo" = false WHERE "isDemo" = true');
    console.log('Cleared existing demo flags');

    // Find the most recent analysis
    const result = await client.query(`
      SELECT id, "trailName", "trailLocation", difficulty, "createdAt"
      FROM "TrailAnalysis"
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('No analyses found in the database.');
      return;
    }

    const latestAnalysis = result.rows[0];
    console.log('Found latest analysis:', latestAnalysis);

    // Mark it as demo
    await client.query('UPDATE "TrailAnalysis" SET "isDemo" = true WHERE id = $1', [latestAnalysis.id]);

    console.log('Marked as demo analysis:', latestAnalysis.id);
    console.log('Trail:', latestAnalysis.trailName || 'Unnamed');
    console.log('Location:', latestAnalysis.trailLocation || 'Unknown');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
