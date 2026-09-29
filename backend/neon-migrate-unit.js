const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('Updating product units to "pack"...');
    await sql`UPDATE "products" SET "unit" = 'pack' WHERE "unit" = 'pcs';`;
    console.log('Update successful!');
  } catch (e) {
    console.error('Error:', e);
  }
}
run();
