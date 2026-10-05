require('dotenv').config();
const { Pool, neonConfig } = require('@neondatabase/serverless');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { PrismaClient } = require('@prisma/client');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;
const url = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: url });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

const ZONE_ANCHORS = [
  {
    zone: 'Yeka Abado Condominium & Core Blocks',
    subCity: 'Yeka',
    centerLat: 9.0350,
    centerLng: 38.8450,
    latSpan: 0.035,
    lngSpan: 0.040,
    keywords: ['Abado', 'G7', 'Meskelenya', 'Bilen', 'Rufael'],
  },
  {
    zone: 'Yeka Ayat, CMC & Kotebe',
    subCity: 'Yeka',
    centerLat: 9.0230,
    centerLng: 38.8250,
    latSpan: 0.035,
    lngSpan: 0.040,
    keywords: ['CMC', 'Ayat', 'Kotebe', 'Gurd Shola', 'Century', 'Megenagna', 'Diaspora'],
  },
  {
    zone: 'Bole Medhanialem, Atlas & Gerji',
    subCity: 'Bole',
    centerLat: 8.9950,
    centerLng: 38.7880,
    latSpan: 0.038,
    lngSpan: 0.042,
    keywords: ['Bole', 'Atlas', 'Medhanialem', 'Gerji', 'Airport', 'Namibia', 'Edna', 'Olympia', 'Imperial', 'Skylight'],
  },
  {
    zone: 'Mercato, Autobis Tera & Kolfe',
    subCity: 'Addis Ketema',
    centerLat: 9.0305,
    centerLng: 38.7360,
    latSpan: 0.035,
    lngSpan: 0.038,
    keywords: ['Mercato', 'Autobis Tera', 'Bomb Tera', 'Shema Tera', 'Berbere', 'Tana', 'Sebategna', 'Kolfe', 'Burayu', 'Cinema Ras'],
  },
  {
    zone: 'Central City Piazza, Churchill & Kazanchis',
    subCity: 'Arada / Kirkos',
    centerLat: 9.0220,
    centerLng: 38.7520,
    latSpan: 0.032,
    lngSpan: 0.028,
    keywords: ['Piazza', 'Churchill', 'Kazanchis', 'Ras Desta', 'City Hall', 'Taitu', 'De Gaulle', 'Tikur Anbessa', 'AAU', 'Enrico', 'Dembel', 'Sheraton', 'Hilton'],
  },
  {
    zone: 'Lebu, Jemo & Kaliti',
    subCity: 'Nefas Silk / Lebu',
    centerLat: 8.9600,
    centerLng: 38.7200,
    latSpan: 0.045,
    lngSpan: 0.050,
    keywords: ['Lebu', 'Jemo', 'Kaliti', 'Kality', 'Varnero', 'Lafto', 'Musika', 'Saris', 'Gotera', 'Nefas Silk'],
  },
];

const phi1 = 0.7548776662466927;
const phi2 = 0.5698402909980532;

async function updateCoordinates() {
  console.log('Fetching customers from Neon database...');
  const customers = await prisma.customer.findMany({
    select: { id: true, name: true, address: true, lat: true, lng: true },
  });

  console.log(`Found ${customers.length} total customers.`);

  // Prepare all updates
  const updates = customers.map((c, i) => {
    let anchor = ZONE_ANCHORS[0]; // default Yeka Abado
    for (const z of ZONE_ANCHORS) {
      if (z.keywords.some((kw) => (c.name + ' ' + (c.address || '')).includes(kw))) {
        anchor = z;
        break;
      }
    }

    const counter = i + 1;
    const u = (((counter * phi1) % 1) - 0.5) * 0.94;
    const v = (((counter * phi2) % 1) - 0.5) * 0.94;

    const jitterAngle = ((counter * 137.5) % 360) * (Math.PI / 180);
    const jitterR = (((counter * 23) % 100) / 100) * 0.05;
    const jLat = Math.sin(jitterAngle) * jitterR;
    const jLng = Math.cos(jitterAngle) * jitterR;

    const offsetLat = (u + jLat) * anchor.latSpan;
    const offsetLng = (v + jLng) * anchor.lngSpan;

    const newLat = Number((anchor.centerLat + offsetLat).toFixed(6));
    const newLng = Number((anchor.centerLng + offsetLng).toFixed(6));

    return { id: c.id, lat: newLat, lng: newLng };
  });

  // Batch process with concurrency of 50
  const BATCH_SIZE = 50;
  let done = 0;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map((item) =>
        prisma.customer.update({
          where: { id: item.id },
          data: { lat: item.lat, lng: item.lng },
        })
      )
    );
    done += chunk.length;
    console.log(`Updated ${done}/${updates.length} customer coordinates...`);
  }

  console.log(`✅ All ${done} customers successfully updated with natural 2D scatter!`);
}

updateCoordinates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
