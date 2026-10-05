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
  // 1. SPECIFIC YEKA ABADO CORE (Blocks, Sites, Condos, Gates, Markets)
  {
    zone: 'Yeka Abado Condominium & Core Blocks',
    subCity: 'Yeka',
    sector: 'YEKA',
    centerLat: 9.0350,
    centerLng: 38.8450,
    latSpan: 0.035,
    lngSpan: 0.040,
    types: [
      {
        type: 'RETAILER',
        defaultCategory: 'Retailer',
        prefixes: [
          'Abado Site 1 Block 12', 'Abado Site 1 Block 34', 'Abado Site 2 Block 5', 'Abado Site 2 Block 19',
          'Abado Site 3 Block 8', 'Abado Site 3 Block 42', 'Abado Site 4 Block 15', 'Abado Site 4 Block 27',
          'Abado Site 5 Block 3', 'Abado Site 5 Block 31', 'Abado Site 6 Block 11', 'Abado Site 6 Block 50',
          'Abado Site 7 Block 14', 'Abado Site 8 Block 22', 'Abado Site 9 Block 38', 'Abado Site 10 Block 7',
          'Abado Site 11 Block 45', 'Abado Site 12 Block 9', 'Abado Site 13 Block 18', 'Abado Site 14 Block 29',
          'Abado Adebabay G7', 'Abado Meskelenya Junction', 'Abado Asfalt Dama', 'Abado Taxi Station Gate',
          'Abado Condominium Phase 1', 'Abado Condominium Phase 2', 'Abado Block 88 Corner', 'Abado Block 102 Mart'
        ],
        suffixes: ['Mini Mart', 'Beverage Kiosk', 'Retail Shop', 'Provisions Store', 'Soft Drinks Depot', 'Groceries & Water Drop', 'Corner Mart'],
      },
      {
        type: 'CAFE',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: [
          'Abado Morning Sun', 'Selam Abado', 'Bilen Abado', 'Meskelenya View', 'G7 Square', 'Abado Highland',
          'Enat Bunna', 'Birr Bunna Abado', 'Adebabay Pastry', 'Tsehay Bunna Bet', 'Site 4 Corner', 'Block 19 Lounge',
          'Abado Breeze', 'Sheger Cup Abado', 'Topwater Oasis Abado', 'Golden Bean Abado'
        ],
        suffixes: ['Bunna Bet & Cafe', 'Pastry & Espresso House', 'Specialty Coffee & Tea', 'Traditional Bunna', 'Fast Burger & Cafe', 'Patisserie Lounge'],
      },
      {
        type: 'HOTEL_RESTAURANT',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: [
          'Bilen Kitfo Abado', 'Abado Meskel Grill', 'G7 Adebabay Resto', 'Rufael School Gate', 'City Burgers Abado',
          'Panago Burgers Abado', 'Abyssinia Feast Abado', 'Abado Family Kitchen', 'Site 2 Traditional Kitfo', 'Hikma Shiro & Tibs',
          'Mubarak Abado Lounge', 'Abado View Bistro', 'Tsehay Kitchen Abado', 'Adebabay Traditional Grill'
        ],
        suffixes: ['Traditional Restaurant', 'Kitfo & Butcher Lounge', 'Burgers & Grill', 'Family Dining & Cafe', 'Bistro & Kitchen', 'Local Eatery & Grocery'],
      },
      {
        type: 'SUPERMARKET',
        defaultCategory: 'Supermarket',
        prefixes: [
          'Abado Central', 'Abado Site 3', 'G7 Adebabay', 'Meskelenya Commercial', 'Abado Block 25',
          'Abado Express', 'Fresh Day Abado', 'All-Day Abado', 'Green Mart Abado'
        ],
        suffixes: ['Supermarket', 'Grocery & Beverage Mart', 'Household & Provisions', 'Daily Mart', 'Hypermarket Outlet'],
      },
      {
        type: 'WHOLESALE',
        defaultCategory: 'Wholesale',
        prefixes: [
          'Abado Main Freight Depot', 'Yeka Abado Beverage Wholesale', 'Meskelenya Soft Drinks Agency',
          'Site 1 Bulk Distribution Hub', 'Abado Water & Juice Warehouse', 'G7 Wholesale Center'
        ],
        suffixes: ['Beverage Wholesale', 'Bottled Water Agency', 'FMCG Distribution Depot', 'Wholesale Warehouse', 'Logistics & Offload Yard'],
      },
      {
        type: 'INSTITUTION',
        defaultCategory: 'Other',
        prefixes: [
          'Rufael School Compound', 'Abado Health Center', 'Abado Police Precinct', 'Yeka Abado Youth Center',
          'Abado Primary Community School', 'Abado Postal & Telecom Station', 'Abado Water Supply Depot'
        ],
        suffixes: ['Compound', 'Branch', 'Office', 'Health Station', 'Public Center', 'Facility'],
      },
    ],
  },

  // 2. Yeka / Ayat / CMC / Kotebe / Gurd Shola Corridor
  {
    zone: 'Yeka Ayat, CMC & Kotebe',
    subCity: 'Yeka',
    sector: 'YEKA',
    centerLat: 9.0230,
    centerLng: 38.8350,
    latSpan: 0.040,
    lngSpan: 0.045,
    types: [
      {
        type: 'SUPERMARKET',
        defaultCategory: 'Supermarket',
        prefixes: ['Ayat Zone 2', 'Ayat Zone 3', 'CMC Michael', 'CMC Roundabout', 'Kotebe 02', 'Gurd Shola Athletics', 'Meta Road', 'Century Mall Area', 'Diaspora Square'],
        suffixes: ['Supermarket', 'Mart & Deli', 'Food Store', 'Hypermarket', 'Provisions'],
      },
      {
        type: 'CAFE',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['Ayat Light Rail', 'CMC Sunrise', 'Kotebe Hills', 'Gurd Shola Cup', 'Diaspora Megenagna', 'Meta Brew', 'Century Brew', 'Meklit'],
        suffixes: ['Coffee & Roastery', 'Espresso Lounge', 'Pastry & Bunna', 'Specialty Cafe', 'Cafe Bar'],
      },
      {
        type: 'HOTEL_RESTAURANT',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['CMC Royal', 'Ayat Grand', 'Kotebe Continental', 'Century Feast', 'Gurd Shola Garden', 'Meta View', 'Megenagna Peak'],
        suffixes: ['Cultural Dining', 'Steakhouse', 'Family Restaurant', 'Grill & Lounge', 'Traditional Resto'],
      },
      {
        type: 'RETAILER',
        defaultCategory: 'Retailer',
        prefixes: ['CMC Michael Gate', 'Ayat Terminal', 'Kotebe Meta Gate', 'Gurd Shola Lane', 'Megenagna Terminal St'],
        suffixes: ['Mini Mart', 'Beverage Kiosk', 'Retail Corner', 'Shop', 'Drop Point'],
      },
      {
        type: 'WHOLESALE',
        defaultCategory: 'Wholesale',
        prefixes: ['Kotebe Meta Brewery Corridor', 'Gurd Shola Wholesale Depot', 'CMC Industrial Depot', 'Ayat Supply Yard'],
        suffixes: ['Beverage Wholesale', 'Bulk Agency', 'Distribution Depot', 'Supply Center'],
      },
    ],
  },

  // 3. Bole / Airport / Atlas / Medhanialem / Gerji Corridor
  {
    zone: 'Bole Medhanialem, Atlas & Gerji',
    subCity: 'Bole',
    sector: 'BOLE',
    centerLat: 8.9950,
    centerLng: 38.7880,
    latSpan: 0.038,
    lngSpan: 0.042,
    types: [
      {
        type: 'MALL',
        defaultCategory: 'Supermarket',
        prefixes: ['Atlas Avenue', 'Medhanialem Plaza', 'Airport Road', 'Gerji Imperial', 'Olympia Trade', 'Namibia St', 'Tele Bole', 'Morning Star', 'Berhane Adere'],
        suffixes: ['Mall & Commercial Center', 'Galleria', 'Trade Center', 'Tower & Shopping', 'Boutique Plaza'],
      },
      {
        type: 'CAFE',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['Aroma', 'Habesha Gold', 'Highland', 'Red Bean', 'Bole Velvet', 'Skyline', 'Roast & Toast', 'Golden Cup', 'Caffè Nero Addis', 'Moka', 'Babi', 'Tomoca', 'Kaldis'],
        suffixes: ['Coffee Lounge', 'Patisserie & Cafe', 'Artisan Roasters', 'Bistro & Espresso', 'Gelato & Coffee', 'Creperie'],
      },
      {
        type: 'HOTEL_RESTAURANT',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['Crown Bole', 'Atlas Star', 'Diplomat', 'Blue Nile', 'Meridian', 'Abyssinia Premium', 'Safari', 'Red Sea', 'Oasis', 'Skylight Deluxe', '2000 Habesha', 'Yod Abyssinia', 'Kategna'],
        suffixes: ['Steakhouse & Grill', 'Lounge & Bar', 'Fusion Bistro', 'Italian Trattoria', 'Boutique Hotel', 'Continental Dining'],
      },
      {
        type: 'SUPERMARKET',
        defaultCategory: 'Supermarket',
        prefixes: ['Bole Gourmet', 'Atlas Fresh', 'Gerji City', 'Imperial Prime', 'Medhanialem Choice', 'Safeway Gerji', 'Fantu Super', 'Fresh Corner'],
        suffixes: ['Supermarket', 'Gourmet Foods', 'Provisions & Deli', 'Hypermarket'],
      },
      {
        type: 'INSTITUTION',
        defaultCategory: 'Other',
        prefixes: ['Bole International Cargo', 'Civil Aviation Bureau', 'Diplomatic Mission Annex', 'Korean Hospital Complex', 'Gerji Science Institute', 'Bole Customs'],
        suffixes: ['Depot', 'HQ', 'Campus', 'Medical Center', 'Headquarters'],
      },
    ],
  },

  // 4. Mercato / Autobis Tera / Addis Ketema / Kolfe Corridor
  {
    zone: 'Mercato, Autobis Tera & Kolfe',
    subCity: 'Addis Ketema',
    sector: 'MERCATO',
    centerLat: 9.0305,
    centerLng: 38.7360,
    latSpan: 0.035,
    lngSpan: 0.038,
    types: [
      {
        type: 'WHOLESALE',
        defaultCategory: 'Wholesale',
        prefixes: ['Autobis Tera Main', 'Bomb Tera', 'Shema Tera', 'Berbere Depot', 'Sophi Mall Area', 'Gojjam Ber', 'Tana Market', 'Cinema Ras Yard', 'Sebategna', 'Kolfe Checkpoint', 'Burayu Gate'],
        suffixes: ['Beverage Wholesale', 'Bulk Water Distributor', 'FMCG Depot', 'General Merchandise', 'Trading House', 'Logistics Terminal'],
      },
      {
        type: 'RETAILER',
        defaultCategory: 'Retailer',
        prefixes: ['Anfo 18', 'Kolfe Checkpoint', 'Gefersa Way', 'Mercato Gate 4', 'Alem Bank Road', 'Ketema Center', 'Autobis Tera Gate 2'],
        suffixes: ['Grocery Store', 'Kiosk & Refreshment', 'Retail Outlet', 'Provisions', 'Corner Store'],
      },
      {
        type: 'CAFE',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['Tana Corner', 'Autobis Gate', 'Shema Bar', 'Teklehaimanot', 'Abinet', 'Kolfe Express'],
        suffixes: ['Traditional Coffee', 'Pastry & Tea', 'Bunna Bet', 'Cafe'],
      },
      {
        type: 'HOTEL_RESTAURANT',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['Mercato Star', 'Tana View', 'Grand Ketema', 'Abinet Traditional', 'Teklehaimanot Feast', 'St. Paul Gate Resto'],
        suffixes: ['Restaurant', 'Local Kitchen', 'Hotel & Dining'],
      },
    ],
  },

  // 5. Central / Arada / Kirkos / Piazza / Churchill Corridor
  {
    zone: 'Central City Piazza, Churchill & Kazanchis',
    subCity: 'Arada / Kirkos',
    sector: 'CENTRAL',
    centerLat: 9.0220,
    centerLng: 38.7520,
    latSpan: 0.032,
    lngSpan: 0.028,
    types: [
      {
        type: 'INSTITUTION',
        defaultCategory: 'Other',
        prefixes: ['Ministry of Trade', 'Federal Revenue Bureau', 'National Theatre', 'City Hall Administration', 'Immigration HQ', 'UN-ECA Africa Hall', 'African Union AU', 'CBE Ras Desta', 'Tele Churchill', 'St. George Cathedral', 'Black Lion Tikur Anbessa', 'AAU 6 Kilo', 'AAU 4 Kilo'],
        suffixes: ['Headquarters', 'Complex', 'Auditorium', 'Centre', 'Department', 'Tower', 'Campus', 'Hospital'],
      },
      {
        type: 'CAFE',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['Piazza Heritage', 'Churchill Brew', 'De Gaulle', 'Arada Classic', 'Taitu Garden', 'Ras Desta', 'Catering Square', 'Central Grind', 'Enrico Pastry', 'Tomoca Wavel'],
        suffixes: ['Coffee House', 'Espresso Bar', 'Vintage Cafe', 'Pastry & Roastery', 'Tea Salon'],
      },
      {
        type: 'HOTEL_RESTAURANT',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['Wavel Corner', 'Piazza Roma', 'Churchill View', 'Ras Hotel', 'Finfinne Springs', 'National Resto', 'Taitu Historic', 'Castelli Italian', 'Sheraton Luxury', 'Hilton Addis', 'Hyatt Regency', 'Radisson Blu', 'Marriott Exec'],
        suffixes: ['Restaurant', 'Dining Room', 'Hotel & Lounge', 'Grill & Bar'],
      },
      {
        type: 'MALL',
        defaultCategory: 'Supermarket',
        prefixes: ['Churchill Galleria', 'Piazza Commercial', 'Arada Shopping', 'Ras Desta Arcade', 'Dembel City Center', 'Getu Commercial'],
        suffixes: ['Mall', 'Commercial Center', 'Arcade'],
      },
    ],
  },

  // 6. Southern / Nefas Silk / Lebu / Jemo / Kaliti Corridor
  {
    zone: 'Lebu, Jemo & Kaliti',
    subCity: 'Nefas Silk / Lebu',
    sector: 'LEBU',
    centerLat: 8.9600,
    centerLng: 38.7200,
    latSpan: 0.052,
    lngSpan: 0.058,
    types: [
      {
        type: 'SUPERMARKET',
        defaultCategory: 'Supermarket',
        prefixes: ['Jemo 1', 'Jemo 2', 'Jemo 3', 'Lebu Roundabout', 'Musika Bet', 'Varnero', 'Lafto Green', 'Gotera South', 'Saris Abo'],
        suffixes: ['Supermarket', 'Grocery & Household', 'Fresh Food Mart', 'Provisions'],
      },
      {
        type: 'WHOLESALE',
        defaultCategory: 'Wholesale',
        prefixes: ['Kaliti Customs Yard', 'Kality Freight', 'Nefas Silk Heavy', 'Akaki Bulk', 'Saris Abo Logistics', 'Gotera Pepsi Interchange'],
        suffixes: ['Distribution Depot', 'Wholesale Terminal', 'FMCG Warehouse', 'Beverage Center'],
      },
      {
        type: 'CAFE',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['Jemo Sunset', 'Lebu Breeze', 'Lafto Stream', 'Musika Lounge', 'Varnero Corner', 'Saris Coffee'],
        suffixes: ['Cafe & Bunna', 'Pastry Shop', 'Coffee Corner', 'Roastery'],
      },
      {
        type: 'HOTEL_RESTAURANT',
        defaultCategory: 'Hotel/Restaurant',
        prefixes: ['Lafto Grand', 'Lebu Star', 'Jemo Heights', 'Saris Garden', 'South City Grill'],
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

// Generates 2,500 uniquely distributed, highly-detailed Addis Ababa business establishments & delivery stops
// Featuring comprehensive coverage of Yeka Abado (condo blocks, sites, markets, cafes, gates) and all Addis corridors.
export function generateComprehensiveAddisLocations(targetCount = 2500): AddisLocationPreset[] {
  const result: AddisLocationPreset[] = [...ADDIS_ABABA_TAGGED_LOCATIONS];
  let counter = 1;

  // Martin Roberts R2 low-discrepancy 2D quasi-random sequence (optimal 2D planar scatter)
  // Guarantees uniform 2D distribution across both latitude and longitude without clustering, grids, or straight lines.
  const phi1 = 0.7548776662466927; // 1 / plastic constant
  const phi2 = 0.5698402909980532; // 1 / (plastic constant ^ 2)

  while (result.length < targetCount) {
    for (const anchor of ZONE_ANCHORS) {
      if (result.length >= targetCount) break;

      for (const t of anchor.types) {
        if (result.length >= targetCount) break;

        const prefix = t.prefixes[(counter * 7 + result.length) % t.prefixes.length];
        const suffix = t.suffixes[(counter * 11 + result.length) % t.suffixes.length];
        const unitNumber = ((counter * 17) % 120) + 1;
        const name = `${prefix} ${suffix} #${unitNumber}`;

        // True 2D planar dispersion across the anchor zone
        const u = (((counter * phi1) % 1) - 0.5) * 0.94; // [-0.47, 0.47]
        const v = (((counter * phi2) % 1) - 0.5) * 0.94; // [-0.47, 0.47]

        // Organic micro-scatter to replicate authentic street/block offsets
        const jitterAngle = ((counter * 137.5) % 360) * (Math.PI / 180);
        const jitterR = (((counter * 23) % 100) / 100) * 0.05;
        const jLat = Math.sin(jitterAngle) * jitterR;
        const jLng = Math.cos(jitterAngle) * jitterR;

        const offsetLat = (u + jLat) * anchor.latSpan;
        const offsetLng = (v + jLng) * anchor.lngSpan;

        const lat = Number((anchor.centerLat + offsetLat).toFixed(6));
        const lng = Number((anchor.centerLng + offsetLng).toFixed(6));

        result.push({
          id: `addis-poi-${counter.toString().padStart(5, '0')}`,
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

export const ADDIS_ABABA_1000_LOCATIONS: AddisLocationPreset[] = generateComprehensiveAddisLocations(2500);
