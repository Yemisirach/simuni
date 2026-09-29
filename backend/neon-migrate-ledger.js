require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);
  console.log('Running migration to add Factory Ledger...');
  
  try {
    await sql`ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "factoryBalance" DECIMAL(12,2) NOT NULL DEFAULT 0;`;
    console.log('Added factoryBalance to organization');

    await sql`
      CREATE TABLE IF NOT EXISTS "factory_transactions" (
        "id" TEXT NOT NULL,
        "workspaceId" TEXT NOT NULL,
        "type" TEXT NOT NULL, 
        "amount" DECIMAL(12,2) NOT NULL,
        "balanceAfter" DECIMAL(12,2) NOT NULL,
        "referenceId" TEXT,
        "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT "factory_transactions_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "factory_transactions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;
    console.log('Created factory_transactions table');
    
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate();
