const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('Adding isActive column to products table...');
    await sql`ALTER TABLE "products" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;`;
    console.log('Column added successfully!');
  } catch (e) {
    if (e.message && e.message.includes('already exists')) {
      console.log('Column already exists!');
    } else {
      console.error('Error:', e);
    }
  }
}
run();
