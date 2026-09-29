const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('Creating zones table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "zones" (
        "id" TEXT NOT NULL,
        "workspaceId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "minLat" DOUBLE PRECISION NOT NULL,
        "maxLat" DOUBLE PRECISION NOT NULL,
        "minLng" DOUBLE PRECISION NOT NULL,
        "maxLng" DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
      );
    `;
    console.log('Adding workspace foreign key to zones...');
    await sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'zones_workspaceId_fkey') THEN
          ALTER TABLE "zones" ADD CONSTRAINT "zones_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `;

    console.log('Adding zoneId to customers...');
    await sql`ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "zoneId" TEXT;`;
    await sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_zoneId_fkey') THEN
          ALTER TABLE "customers" ADD CONSTRAINT "customers_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `;

    console.log('Adding zoneId to routes...');
    await sql`ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "zoneId" TEXT;`;
    await sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'routes_zoneId_fkey') THEN
          ALTER TABLE "routes" ADD CONSTRAINT "routes_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `;

    console.log('Database migration completed successfully!');
  } catch (e) {
    console.error('Error:', e);
  }
}
run();
