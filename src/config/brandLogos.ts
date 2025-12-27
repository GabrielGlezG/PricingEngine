// Car brand logos mapping using reliable CDN sources
// Uses car-logos-dataset and alternative sources for comprehensive coverage

const LOGO_CDN_BASE = "https://www.carlogos.org/car-logos";
const LOGO_CDN_ALT = "https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized";

// Map brand names to their logo filenames (normalized)
const brandLogoMap: Record<string, string> = {
  // Common brands with verified logos
  "TOYOTA": `${LOGO_CDN_ALT}/toyota.png`,
  "HONDA": `${LOGO_CDN_ALT}/honda.png`,
  "NISSAN": `${LOGO_CDN_ALT}/nissan.png`,
  "MAZDA": `${LOGO_CDN_ALT}/mazda.png`,
  "SUZUKI": `${LOGO_CDN_ALT}/suzuki.png`,
  "MITSUBISHI": `${LOGO_CDN_ALT}/mitsubishi.png`,
  "SUBARU": `${LOGO_CDN_ALT}/subaru.png`,
  "HYUNDAI": `${LOGO_CDN_ALT}/hyundai.png`,
  "KIA": `${LOGO_CDN_ALT}/kia.png`,
  "FORD": `${LOGO_CDN_ALT}/ford.png`,
  "CHEVROLET": `${LOGO_CDN_ALT}/chevrolet.png`,
  "VOLKSWAGEN": `${LOGO_CDN_ALT}/volkswagen.png`,
  "AUDI": `${LOGO_CDN_ALT}/audi.png`,
  "BMW": `${LOGO_CDN_ALT}/bmw.png`,
  "MERCEDES-BENZ": `${LOGO_CDN_ALT}/mercedes-benz.png`,
  "MERCEDES": `${LOGO_CDN_ALT}/mercedes-benz.png`,
  "PORSCHE": `${LOGO_CDN_ALT}/porsche.png`,
  "LEXUS": `${LOGO_CDN_ALT}/lexus.png`,
  "INFINITI": `${LOGO_CDN_ALT}/infiniti.png`,
  "ACURA": `${LOGO_CDN_ALT}/acura.png`,
  "VOLVO": `${LOGO_CDN_ALT}/volvo.png`,
  "LAND ROVER": `${LOGO_CDN_ALT}/land-rover.png`,
  "JAGUAR": `${LOGO_CDN_ALT}/jaguar.png`,
  "JEEP": `${LOGO_CDN_ALT}/jeep.png`,
  "DODGE": `${LOGO_CDN_ALT}/dodge.png`,
  "RAM": `${LOGO_CDN_ALT}/ram.png`,
  "CHRYSLER": `${LOGO_CDN_ALT}/chrysler.png`,
  "GMC": `${LOGO_CDN_ALT}/gmc.png`,
  "CADILLAC": `${LOGO_CDN_ALT}/cadillac.png`,
  "BUICK": `${LOGO_CDN_ALT}/buick.png`,
  "LINCOLN": `${LOGO_CDN_ALT}/lincoln.png`,
  "TESLA": `${LOGO_CDN_ALT}/tesla.png`,
  "RIVIAN": `${LOGO_CDN_ALT}/rivian.png`,
  "PEUGEOT": `${LOGO_CDN_ALT}/peugeot.png`,
  "CITROËN": `${LOGO_CDN_ALT}/citroen.png`,
  "CITROEN": `${LOGO_CDN_ALT}/citroen.png`,
  "RENAULT": `${LOGO_CDN_ALT}/renault.png`,
  "FIAT": `${LOGO_CDN_ALT}/fiat.png`,
  "ALFA ROMEO": `${LOGO_CDN_ALT}/alfa-romeo.png`,
  "MASERATI": `${LOGO_CDN_ALT}/maserati.png`,
  "FERRARI": `${LOGO_CDN_ALT}/ferrari.png`,
  "LAMBORGHINI": `${LOGO_CDN_ALT}/lamborghini.png`,
  "BENTLEY": `${LOGO_CDN_ALT}/bentley.png`,
  "ROLLS-ROYCE": `${LOGO_CDN_ALT}/rolls-royce.png`,
  "ASTON MARTIN": `${LOGO_CDN_ALT}/aston-martin.png`,
  "MCLAREN": `${LOGO_CDN_ALT}/mclaren.png`,
  "MINI": `${LOGO_CDN_ALT}/mini.png`,
  "SEAT": `${LOGO_CDN_ALT}/seat.png`,
  "SKODA": `${LOGO_CDN_ALT}/skoda.png`,
  "OPEL": `${LOGO_CDN_ALT}/opel.png`,
  "GENESIS": `${LOGO_CDN_ALT}/genesis.png`,
  "SSANGYONG": `${LOGO_CDN_ALT}/ssangyong.png`,
  "ISUZU": `${LOGO_CDN_ALT}/isuzu.png`,
  "DAIHATSU": `${LOGO_CDN_ALT}/daihatsu.png`,
  "HAVAL": `${LOGO_CDN_ALT}/haval.png`,
  "GREAT WALL": `${LOGO_CDN_ALT}/great-wall.png`,
  "CHERY": `${LOGO_CDN_ALT}/chery.png`,
  "GEELY": `${LOGO_CDN_ALT}/geely.png`,
  "BYD": `${LOGO_CDN_ALT}/byd.png`,
  "MG": `${LOGO_CDN_ALT}/mg.png`,
  "CHANGAN": `${LOGO_CDN_ALT}/changan.png`,
  "JAC": `${LOGO_CDN_ALT}/jac.png`,
  "LIFAN": `${LOGO_CDN_ALT}/lifan.png`,
  "FOTON": `${LOGO_CDN_ALT}/foton.png`,
  "DONGFENG": `${LOGO_CDN_ALT}/dongfeng.png`,
  "HINO": `${LOGO_CDN_ALT}/hino.png`,
  "UD TRUCKS": `${LOGO_CDN_ALT}/ud-trucks.png`,
  "SCANIA": `${LOGO_CDN_ALT}/scania.png`,
  "MAN": `${LOGO_CDN_ALT}/man.png`,
  "IVECO": `${LOGO_CDN_ALT}/iveco.png`,
  "KENWORTH": `${LOGO_CDN_ALT}/kenworth.png`,
  "PETERBILT": `${LOGO_CDN_ALT}/peterbilt.png`,
  "FREIGHTLINER": `${LOGO_CDN_ALT}/freightliner.png`,
  "INTERNATIONAL": `${LOGO_CDN_ALT}/international.png`,
  "MACK": `${LOGO_CDN_ALT}/mack.png`,
  "CUPRA": `${LOGO_CDN_ALT}/cupra.png`,
  "DS": `${LOGO_CDN_ALT}/ds.png`,
  "SMART": `${LOGO_CDN_ALT}/smart.png`,
  "MAYBACH": `${LOGO_CDN_ALT}/maybach.png`,
  "BUGATTI": `${LOGO_CDN_ALT}/bugatti.png`,
  "KOENIGSEGG": `${LOGO_CDN_ALT}/koenigsegg.png`,
  "PAGANI": `${LOGO_CDN_ALT}/pagani.png`,
  "LOTUS": `${LOGO_CDN_ALT}/lotus.png`,
  "ALPINE": `${LOGO_CDN_ALT}/alpine.png`,
  "POLESTAR": `${LOGO_CDN_ALT}/polestar.png`,
  "LUCID": `${LOGO_CDN_ALT}/lucid.png`,
  "NIO": `${LOGO_CDN_ALT}/nio.png`,
  "XPENG": `${LOGO_CDN_ALT}/xpeng.png`,
  "LI AUTO": `${LOGO_CDN_ALT}/li-auto.png`,
  "VINFAST": `${LOGO_CDN_ALT}/vinfast.png`,
  "TATA": `${LOGO_CDN_ALT}/tata.png`,
  "MAHINDRA": `${LOGO_CDN_ALT}/mahindra.png`,
  "MARUTI SUZUKI": `${LOGO_CDN_ALT}/maruti-suzuki.png`,
  "PROTON": `${LOGO_CDN_ALT}/proton.png`,
  "PERODUA": `${LOGO_CDN_ALT}/perodua.png`,
  "MAXUS": `${LOGO_CDN_ALT}/maxus.png`,
};


const SVG_CDN_BASE = "https://www.vectorlogo.zone/logos";

/**
 * Get SVG logo URL for a car brand (Primary Source)
 * @param brand - The brand name
 * @returns The SVG URL
 */
export function getBrandSvgUrl(brand: string): string | null {
  if (!brand) return null;

  // Normalization for vectorlogo.zone slugs
  let slug = brand.toLowerCase().trim()
    .replace(/\s+/g, '-')     // Spaces to hyphens
    .replace(/\.+/g, '')      // Remove dots (e.g. V.W -> vw)
    .replace(/[^a-z0-9-]/g, ''); // Remove other special chars

  // Handle known special cases for vectorlogo.zone
  const specialCases: Record<string, string> = {
    "mercedes": "mercedes-benz",
    "vw": "volkswagen",
    "chevy": "chevrolet"
  };

  if (specialCases[slug]) {
    slug = specialCases[slug];
  }

  return `${SVG_CDN_BASE}/${slug}/${slug}-icon.svg`;
}

/**
 * Get logo URL for a car brand
 * @param brand - The brand name (case insensitive)
 * @returns The logo URL (PNG) or null if not found
 */
export function getBrandLogo(brand: string): string | null {
  if (!brand) return null;

  const normalizedBrand = brand.toUpperCase().trim();
  return brandLogoMap[normalizedBrand] || null;
}

/**
 * Get initials from brand name for fallback display
 * @param brand - The brand name
 * @returns Initials (max 2 characters)
 */
export function getBrandInitials(brand: string): string {
  if (!brand) return "?";

  const words = brand.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words.slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

/**
 * Get brand color based on brand name (deterministic)
 * @param brand - The brand name
 * @returns HSL color string
 */
export function getBrandColor(brand: string): string {
  if (!brand) return "hsl(217, 91%, 50%)";

  // Generate a deterministic color based on brand name
  let hash = 0;
  for (let i = 0; i < brand.length; i++) {
    hash = brand.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 45%)`;
}

export default brandLogoMap;
