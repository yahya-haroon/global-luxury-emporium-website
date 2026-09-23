/**
 * Maps a country's full English display name to its ISO 3166-1 alpha-2 code.
 * Used exclusively when passing billing_details.address.country to Stripe, which
 * requires 2-letter codes. The full name is still stored in our own Supabase orders table.
 *
 * Returns the input string unchanged if no match is found (Stripe may still error,
 * but at least we don't silently corrupt valid codes the customer typed manually).
 */

const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
  // A
  Afghanistan: 'AF',
  Albania: 'AL',
  Algeria: 'DZ',
  Andorra: 'AD',
  Angola: 'AO',
  Argentina: 'AR',
  Armenia: 'AM',
  Australia: 'AU',
  Austria: 'AT',
  Azerbaijan: 'AZ',
  // B
  Bahrain: 'BH',
  Bangladesh: 'BD',
  Belgium: 'BE',
  Bolivia: 'BO',
  'Bosnia and Herzegovina': 'BA',
  Brazil: 'BR',
  Bulgaria: 'BG',
  // C
  Cambodia: 'KH',
  Canada: 'CA',
  Chile: 'CL',
  China: 'CN',
  Colombia: 'CO',
  Croatia: 'HR',
  Cyprus: 'CY',
  'Czech Republic': 'CZ',
  Czechia: 'CZ',
  // D
  Denmark: 'DK',
  // E
  Ecuador: 'EC',
  Egypt: 'EG',
  Estonia: 'EE',
  Ethiopia: 'ET',
  // F
  Finland: 'FI',
  France: 'FR',
  // G
  Georgia: 'GE',
  Germany: 'DE',
  Ghana: 'GH',
  Greece: 'GR',
  // H
  'Hong Kong': 'HK',
  Hungary: 'HU',
  // I
  Iceland: 'IS',
  India: 'IN',
  Indonesia: 'ID',
  Iran: 'IR',
  Iraq: 'IQ',
  Ireland: 'IE',
  Israel: 'IL',
  Italy: 'IT',
  // J
  Japan: 'JP',
  Jordan: 'JO',
  // K
  Kazakhstan: 'KZ',
  Kenya: 'KE',
  Kuwait: 'KW',
  Kyrgyzstan: 'KG',
  // L
  Latvia: 'LV',
  Lebanon: 'LB',
  Libya: 'LY',
  Lithuania: 'LT',
  Luxembourg: 'LU',
  // M
  Malaysia: 'MY',
  Maldives: 'MV',
  Malta: 'MT',
  Mexico: 'MX',
  Moldova: 'MD',
  Morocco: 'MA',
  // N
  Nepal: 'NP',
  Netherlands: 'NL',
  'New Zealand': 'NZ',
  Nigeria: 'NG',
  Norway: 'NO',
  // O
  Oman: 'OM',
  // P
  Pakistan: 'PK',
  Palestine: 'PS',
  Philippines: 'PH',
  Poland: 'PL',
  Portugal: 'PT',
  // Q
  Qatar: 'QA',
  // R
  Romania: 'RO',
  Russia: 'RU',
  'Russian Federation': 'RU',
  // S
  'Saudi Arabia': 'SA',
  Serbia: 'RS',
  Singapore: 'SG',
  Slovakia: 'SK',
  Slovenia: 'SI',
  'South Africa': 'ZA',
  'South Korea': 'KR',
  Spain: 'ES',
  'Sri Lanka': 'LK',
  Sweden: 'SE',
  Switzerland: 'CH',
  // T
  Taiwan: 'TW',
  Tajikistan: 'TJ',
  Tanzania: 'TZ',
  Thailand: 'TH',
  Tunisia: 'TN',
  Turkey: 'TR',
  Turkmenistan: 'TM',
  // U
  Uganda: 'UG',
  Ukraine: 'UA',
  'United Arab Emirates': 'AE',
  UAE: 'AE',
  'United Kingdom': 'GB',
  UK: 'GB',
  'United States': 'US',
  'United States of America': 'US',
  USA: 'US',
  Uzbekistan: 'UZ',
  // V
  Venezuela: 'VE',
  Vietnam: 'VN',
  // Y
  Yemen: 'YE',
  // Z
  Zimbabwe: 'ZW',
};

/**
 * Converts a country display name to an ISO 3166-1 alpha-2 code.
 * Lookup is case-insensitive. Returns the original string if no match is found.
 *
 * @param name - Full English country name (e.g. "United Kingdom")
 * @returns ISO alpha-2 code (e.g. "GB") or the original name if unknown
 */
export function countryNameToIso2(name: string): string {
  if (!name) return name;

  // Direct match (case-sensitive fast path)
  if (COUNTRY_NAME_TO_ISO2[name]) return COUNTRY_NAME_TO_ISO2[name];

  // Case-insensitive fallback
  const lower = name.toLowerCase();
  const found = Object.entries(COUNTRY_NAME_TO_ISO2).find(
    ([k]) => k.toLowerCase() === lower
  );
  return found ? found[1] : name;
}
