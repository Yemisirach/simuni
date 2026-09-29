require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('Running migration to create Factory Orders...');
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "factory_orders" (
        "id" TEXT NOT NULL,
        "workspaceId" TEXT NOT NULL,
        "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "totalBudget" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT "factory_orders_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "factory_orders_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;
    console.log('Created factory_orders table');

    await sql`
      CREATE TABLE IF NOT EXISTS "factory_order_items" (
        "id" TEXT NOT NULL,
        "factoryOrderId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL,
        "buyPrice" DECIMAL(12,2) NOT NULL,
        "total" DECIMAL(12,2) NOT NULL,
        
        CONSTRAINT "factory_order_items_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "factory_order_items_factoryOrderId_fkey" FOREIGN KEY ("factoryOrderId") REFERENCES "factory_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "factory_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `;
    console.log('Created factory_order_items table');
    
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate();
