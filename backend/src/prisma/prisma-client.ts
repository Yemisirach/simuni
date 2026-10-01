import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }

  return url;
}

function shouldUseNeonAdapter(url: string) {
  return process.env.PRISMA_USE_NEON_ADAPTER === 'true' || url.includes('neon.tech');
}

export function getPrismaClientOptions() {
  const url = databaseUrl();
  if (!shouldUseNeonAdapter(url)) return {};

  // Neon Serverless adapter configuration to bypass VPN over WebSockets
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: url });
  return { adapter: new PrismaNeon(pool as any) };
}
