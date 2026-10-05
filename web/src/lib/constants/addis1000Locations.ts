import { ADDIS_ABABA_TAGGED_LOCATIONS, AddisLocationPreset } from './addisLocations';

// Corridor anchor data for synthesizing authentic, realistically-distributed neighborhood locations
interface ZoneAnchor {
  zone: string;
  subCity: string;
  sector: 'YEKA' | 'MERCATO' | 'BOLE' | 'CENTRAL' | 'KOLFE' | 'AKAKI' | 'ARADA' | 'LEBU';
  centerLat: number;
  centerLng: number;
  latSpan: number;
  lngSpan: number;
  types: Array<{
    type: 'MALL' | 'HOTEL_RESTAURANT' | 'CAFE' | 'INSTITUTION' | 'WHOLESALE' | 'SUPERMARKET' | 'RETAILER';
    defaultCategory: 'Supermarket' | 'Hotel/Restaurant' | 'Wholesale' | 'Retailer' | 'Other';
    prefixes: string[];
    suffixes: string[];
  }>;
}

const ZONE_ANCHORS: ZoneAnchor[] = [
  // 1. Yeka / Abado / Ayat / CMC Corridor
  {
    zone: 'Yeka Abado & Ayat',
    subCity: 'Yeka',
    sector: 'YEKA',
    centerLat: 9.0255,
    centerLng: 38.8250,
    latSpan: 0.045,
    lngSpan: 0.050,
    types: [
      {
        type: 'CAFE',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['Abado Sunset', 'Selam', 'Ayat View', 'Kotebe Hill', 'Gurd Shola', 'Enat', 'Zelalem', 'Marr', 'Birr', 'Tsehay', 'Meklit', 'Alem'],
        suffixes: ['Specialty Coffee', 'Roastery & Cafe', 'Pastry & Cafe', 'Bunna Bet', 'Espresso Lounge', 'Tea & Pastry House'],
      },
      {
        type: 'HOTEL_RESTAURANT',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['Yeka Crest', 'Abado Continental', 'Ayat Grand', 'Kotebe Family', 'CMC Royal', 'Green Park', 'Hikma', 'Mubarak', 'Bilen', 'Selam'],
        suffixes: ['Cultural Restaurant', 'Kitfo & Grill House', 'Kitchen & Lounge', 'Traditional Dining', 'Family Restaurant', 'Burger & Bistro'],
      },
      {
        type: 'SUPERMARKET',
        defaultCategory: 'Supermarket',
        prefixes: ['Ayat Zone 2', 'Abado Central', 'CMC Michael', 'Kotebe Meta', 'Gurd Shola', 'Fresh Day', 'Mega', 'Family Care', 'All-Day'],
        suffixes: ['Supermarket', 'Mart & Provisions', 'Grocery & Beverage', 'Daily Hypermarket', 'Express Mart'],
      },
      {
        type: 'RETAILER',
        defaultCategory: 'Retailer',
        prefixes: ['Block 12', 'Site 4', 'Ayat Terminal', 'Kotebe Gate', 'Abado Square', 'Condo Corner', 'Gurd Shola Lane', 'Meta Road'],
        suffixes: ['Mini Mart', 'Beverage Kiosk', 'Retail Corner', 'Shop & Drop', 'General Store', 'Soft Drinks Depot'],
      },
      {
        type: 'INSTITUTION',
        defaultCategory: 'Other',
        prefixes: ['Yeka Health Center', 'Ayat Community School', 'Kotebe University Wing', 'CMC Primary Clinic', 'Abado Youth Academy'],
        suffixes: ['Campus', 'Clinic', 'Compound', 'Branch', 'Office'],
      },
    ],
  },

  // 2. Bole / Airport / Atlas / Gerji / Medhanialem Corridor
  {
    zone: 'Bole Medhanialem & Atlas',
    subCity: 'Bole',
    sector: 'BOLE',
    centerLat: 8.9950,
    centerLng: 38.7880,
    latSpan: 0.035,
    lngSpan: 0.040,
    types: [
      {
        type: 'MALL',
        defaultCategory: 'Supermarket',
        prefixes: ['Atlas Avenue', 'Medhanialem Plaza', 'Airport Road', 'Gerji Imperial', 'Olympia Trade', 'Namibia', 'Tele Bole'],
        suffixes: ['Mall & Commercial Center', 'Galleria', 'Trade Center', 'Tower & Shopping', 'Boutique Plaza'],
      },
      {
        type: 'CAFE',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['Aroma', 'Habesha Gold', 'Highland', 'Red Bean', 'Bole Velvet', 'Skyline', 'Roast & Toast', 'Golden Cup', 'Caffè Nero Addis', 'Moka'],
        suffixes: ['Coffee Lounge', 'Patisserie & Cafe', 'Artisan Roasters', 'Bistro & Espresso', 'Gelato & Coffee', 'Creperie'],
      },
      {
        type: 'HOTEL_RESTAURANT',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['Crown Bole', 'Atlas Star', 'Diplomat', 'Blue Nile', 'Meridian', 'Abyssinia Premium', 'Safari', 'Red Sea', 'Oasis', 'Flavors of Addis'],
        suffixes: ['Steakhouse & Grill', 'Lounge & Bar', 'Fusion Bistro', 'Italian Trattoria', 'Boutique Hotel', 'Continental Dining'],
      },
      {
        type: 'SUPERMARKET',
        defaultCategory: 'Supermarket',
        prefixes: ['Bole Gourmet', 'Atlas Fresh', 'Gerji City', 'Imperial Prime', 'Medhanialem Choice', 'Airport Road Super'],
        suffixes: ['Supermarket', 'Gourmet Foods', 'Provisions & Deli', 'Hypermarket'],
      },
      {
        type: 'INSTITUTION',
        defaultCategory: 'Other',
        prefixes: ['Bole International Cargo', 'Civil Aviation Bureau', 'Diplomatic Mission Annex', 'Korean Hospital Complex', 'Gerji Science Institute'],
        suffixes: ['Depot', 'HQ', 'Campus', 'Medical Center', 'Headquarters'],
      },
    ],
  },

  // 3. Mercato / Autobis Tera / Addis Ketema / Kolfe Corridor
  {
    zone: 'Mercato & Autobis Tera',
    subCity: 'Addis Ketema',
    sector: 'MERCATO',
    centerLat: 9.0305,
    centerLng: 38.7360,
    latSpan: 0.030,
    lngSpan: 0.035,
    types: [
      {
        type: 'WHOLESALE',
        defaultCategory: 'Wholesale',
        prefixes: ['Autobis Tera Main', 'Bomb Tera', 'Shema Tera', 'Berbere Depot', 'Sophi Mall Area', 'Gojjam Ber', 'Tana Market', 'Cinema Ras Yard', 'Sebategna'],
        suffixes: ['Beverage Wholesale', 'Bulk Water Distributor', 'FMCG Depot', 'General Merchandise', 'Trading House', 'Logistics Terminal'],
      },
      {
        type: 'RETAILER',
        defaultCategory: 'Retailer',
        prefixes: ['Anfo 18', 'Kolfe Checkpoint', 'Gefersa Way', 'Mercato Gate 4', 'Alem Bank Road', 'Ketema Center'],
        suffixes: ['Grocery Store', 'Kiosk & Refreshment', 'Retail Outlet', 'Provisions', 'Corner Store'],
      },
      {
        type: 'CAFE',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['Tana Corner', 'Autobis Gate', 'Shema Bar', 'Teklehaimanot', 'Abinet'],
        suffixes: ['Traditional Coffee', 'Pastry & Tea', 'Bunna Bet', 'Cafe'],
      },
      {
        type: 'HOTEL_RESTAURANT',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['Mercato Star', 'Tana View', 'Grand Ketema', 'Abinet Traditional', 'Teklehaimanot Feast'],
        suffixes: ['Restaurant', 'Local Kitchen', 'Hotel & Dining'],
      },
    ],
  },

  // 4. Central / Arada / Kirkos / Piazza / Churchill Corridor
  {
    zone: 'Central City Piazza & Kirkos',
    subCity: 'Arada / Kirkos',
    sector: 'CENTRAL',
    centerLat: 9.0220,
    centerLng: 38.7520,
    latSpan: 0.030,
    lngSpan: 0.025,
    types: [
      {
        type: 'INSTITUTION',
        defaultCategory: 'Other',
        prefixes: ['Ministry of Trade', 'Federal Revenue Bureau', 'National Theatre', 'City Hall Administration', 'Immigration HQ', 'ECA Annex', 'CBE Ras Desta', 'Tele Churchill', 'St. George Cathedral'],
        suffixes: ['Headquarters', 'Complex', 'Auditorium', 'Centre', 'Department', 'Tower'],
      },
      {
        type: 'CAFE',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['Piazza Heritage', 'Churchill Brew', 'De Gaulle', 'Arada Classic', 'Taitu Garden', 'Ras Desta', 'Catering Square', 'Central Grind'],
        suffixes: ['Coffee House', 'Espresso Bar', 'Vintage Cafe', 'Pastry & Roastery', 'Tea Salon'],
      },
      {
        type: 'HOTEL_RESTAURANT',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['Wavel Corner', 'Piazza Roma', 'Churchill View', 'Ras Hotel', 'Finfinne Springs', 'National Resto', 'Taitu Historic'],
        suffixes: ['Restaurant', 'Dining Room', 'Hotel & Lounge', 'Grill & Bar'],
      },
      {
        type: 'MALL',
        defaultCategory: 'Supermarket',
        prefixes: ['Churchill Galleria', 'Piazza Commercial', 'Arada Shopping', 'Ras Desta Arcade'],
        suffixes: ['Mall', 'Commercial Center', 'Arcade'],
      },
    ],
  },

  // 5. Southern / Nefas Silk / Lebu / Jemo / Kaliti Corridor
  {
    zone: 'Lebu, Jemo & Kaliti',
    subCity: 'Nefas Silk / Lebu',
    sector: 'LEBU',
    centerLat: 8.9600,
    centerLng: 38.7200,
    latSpan: 0.050,
    lngSpan: 0.055,
    types: [
      {
        type: 'SUPERMARKET',
        defaultCategory: 'Supermarket',
        prefixes: ['Jemo 1', 'Jemo 2', 'Jemo 3', 'Lebu Roundabout', 'Musika Bet', 'Varnero', 'Lafto Green', 'Gotera South'],
        suffixes: ['Supermarket', 'Grocery & Household', 'Fresh Food Mart', 'Provisions'],
      },
      {
        type: 'WHOLESALE',
        defaultCategory: 'Wholesale',
        prefixes: ['Kaliti Customs Yard', 'Kality Freight', 'Nefas Silk Heavy', 'Akaki Bulk', 'Saris Abo Logistics'],
        suffixes: ['Distribution Depot', 'Wholesale Terminal', 'FMCG Warehouse', 'Beverage Center'],
      },
      {
        type: 'CAFE',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['Jemo Sunset', 'Lebu Breeze', 'Lafto Stream', 'Musika Lounge', 'Varnero Corner'],
        suffixes: ['Cafe & Bunna', 'Pastry Shop', 'Coffee Corner', 'Roastery'],
      },
      {
        type: 'HOTEL_RESTAURANT',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['Lafto Grand', 'Lebu Star', 'Jemo Heights', 'Saris Garden', 'South City'],
        suffixes: ['Restaurant & Bar', 'Family Dining', 'Traditional Kitchen', 'Grill House'],
      },
      {
        type: 'RETAILER',
        defaultCategory: 'Retailer',
        prefixes: ['Jemo Condo Block 4', 'Jemo Condo Block 18', 'Lebu Main Road', 'Varnero Gate', 'Saris Dama'],
        suffixes: ['Mini Mart', 'Kiosk', 'Retail Store', 'Convenience Shop'],
      },
    ],
  },
];

// Generates 1,000 uniquely distributed, realistic Addis Ababa business establishments & delivery stops
export function generate1000AddisLocations(): AddisLocationPreset[] {
  const result: AddisLocationPreset[] = [...ADDIS_ABABA_TAGGED_LOCATIONS];
  const targetCount = 1000;
  let counter = 1;

  // We loop deterministically through the zone anchors to generate geographically balanced POIs
  while (result.length < targetCount) {
    for (const anchor of ZONE_ANCHORS) {
      if (result.length >= targetCount) break;

      for (const t of anchor.types) {
        if (result.length >= targetCount) break;

        const prefix = t.prefixes[(counter * 7 + result.length) % t.prefixes.length];
        const suffix = t.suffixes[(counter * 11 + result.length) % t.suffixes.length];
        const unitNumber = ((counter * 13) % 95) + 1;
        const name = `${prefix} ${suffix} #${unitNumber}`;

        // Pseudo-random offset within the bounding corridor using deterministic trig
        const angle = ((counter * 47) % 360) * (Math.PI / 180);
        const radiusLat = Math.sin(counter * 3.14159) * (anchor.latSpan / 2);
        const radiusLng = Math.cos(counter * 2.71828) * (anchor.lngSpan / 2);

        const lat = Number((anchor.centerLat + radiusLat).toFixed(6));
        const lng = Number((anchor.centerLng + radiusLng).toFixed(6));

        result.push({
          id: `addis-poi-${counter.toString().padStart(4, '0')}`,
          name,
          subCity: anchor.subCity,
          sector: anchor.sector,
          type: t.type,
          lat,
          lng,
          description: `${t.type.replace('_', ' ')} in ${anchor.zone}, ${anchor.subCity}`,
          defaultCategory: t.defaultCategory,
        });

        counter++;
      }
    }
  }

  return result;
}

export const ADDIS_ABABA_1000_LOCATIONS: AddisLocationPreset[] = generate1000AddisLocations();
