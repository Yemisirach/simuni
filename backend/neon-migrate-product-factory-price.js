require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    await sql`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "factoryPrice" DECIMAL(12,2) NOT NULL DEFAULT 0;`;
    console.log('Added factoryPrice to products');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}
migrate();
