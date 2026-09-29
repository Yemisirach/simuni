require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function check() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    console.log('Tables:', result.map(r => r.table_name));
  } catch (err) {
    console.error('Check failed:', err);
  }
}
check();
