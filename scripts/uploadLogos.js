import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Re-implement the mapping logic here so it runs in Node
const LOGO_CDN_ALT = "https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized";
const SVG_CDN_BASE = "https://www.vectorlogo.zone/logos";

const brandLogoMap = {
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
    "MERCEDES BENZ": `${LOGO_CDN_ALT}/mercedes-benz.png`,
    "GMW": `${LOGO_CDN_ALT}/great-wall.png`,
    "GWM": `${LOGO_CDN_ALT}/great-wall.png`,
    "DFSK": "https://www.car-logos.org/wp-content/uploads/2022/08/DFSK-Logo.png",
    "EXEED": "https://www.car-logos.org/wp-content/uploads/2023/03/exeed-logo-2018-present.png",
    "GAC": "https://www.car-logos.org/wp-content/uploads/2022/08/GAC-Logo.png",
    "JAECOO": "https://assets.cheryinternational.com/themes/jaecoo-co/img/logo.png",
    "JETOUR": "https://www.car-logos.org/wp-content/uploads/2023/04/Jetour-logo-2018.png",
    "JIM": "https://jimautos.cl/wp-content/uploads/2024/01/logo-jim-blanco.png",
    "JMC": "https://www.car-logos.org/wp-content/uploads/2022/08/JMC-Logo.png",
    "KAIYI": "https://www.kaiyiglobal.com/templets/default/images/logo.png",
    "NAMMI": "https://evnammi.com/static/template/132-nammi/images/logo.png",
    "OMODA": "https://www.omoda.cl/wp-content/uploads/2023/05/logo-omoda.png",
    "RIDDARA": "https://riddara.cl/wp-content/uploads/2024/09/Recurso-9-1.png",
    "SWM": "https://www.swmmotors.cl/wp-content/uploads/2023/11/logo_swm.png",
    "VOLTERA": "https://www.voltera.cl/wp-content/uploads/2022/05/Logo-Voltera-Blanco.png",
    "FUSO": "https://www.car-logos.org/wp-content/uploads/2022/08/Fuso-Logo.png",
    "KYC": "https://www.kyc.cl/wp-content/uploads/2021/04/Logo-KYC.png", // specific manual addition
    "LANCIA": `${LOGO_CDN_ALT}/lancia.png`
};

function getBrandSvgUrl(brand) {
    if (!brand) return null;
    let slug = brand.toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/\.+/g, '')
        .replace(/[^a-z0-9-]/g, '');

    const specialCases = { "mercedes": "mercedes-benz", "vw": "volkswagen", "chevy": "chevrolet" };
    if (specialCases[slug]) slug = specialCases[slug];
    return `${SVG_CDN_BASE}/${slug}/${slug}-icon.svg`;
}

function getBrandLogo(brand) {
    if (!brand) return null;
    return brandLogoMap[brand.toUpperCase().trim()] || null;
}

function getClearbitLogoUrl(brand) {
    if (!brand) return null;
    const normalized = brand.toLowerCase().trim();
    const domainMap = {
        'changan': 'changan.cl', 'jac': 'jacautos.cl', 'foton': 'foton.cl',
        'maxus': 'maxus.cl', 'mg': 'mgmotor.cl', 'byd': 'bydauto.cl',
        'chery': 'chery.cl', 'haval': 'haval.cl', 'great wall': 'greatwallmotors.cl',
        'geely': 'geely.cl', 'ssangyong': 'ssangyong.cl', 'dongfeng': 'dongfeng.cl',
        'jetour': 'jetour.cl', 'ram': 'ram.cl', 'gmc': 'gmc.com', 'hino': 'hino.cl',
        'opel': 'opel.cl', 'seat': 'seat.cl', 'skoda': 'skoda.cl', 'tata': 'tatamotors.com',
        'mahindra': 'mahindra.cl', 'lexus': 'lexus.cl', 'aston martin': 'astonmartin.com',
        'peugeot': 'peugeot.cl', 'renault': 'renault.cl', 'fiat': 'fiat.cl',
        'chevrolet': 'chevrolet.cl', 'ford': 'ford.cl', 'toyota': 'toyota.cl',
        'nissan': 'nissan.cl', 'kia': 'kia.cl', 'hyundai': 'hyundai.cl',
        'suzuki': 'suzuki.cl', 'mazda': 'mazda.cl', 'subaru': 'subaru.cl',
        'honda': 'honda.cl', 'mitsubishi': 'mitsubishi-motors.cl',
        'volkswagen': 'volkswagen.cl', 'bmw': 'bmw.cl', 'audi': 'audi.cl',
        'mercedes-benz': 'mercedes-benz.cl', 'volvo': 'volvocars.com',
        'jeep': 'jeep.cl', 'dodge': 'dodge.cl', 'omoda': 'omoda.cl',
        'exeed': 'exeedbornformore.cl', 'dfsk': 'dfsk.cl', 'gac': 'gacmotor.cl',
        'jaecoo': 'jaecoo.cl', 'jim': 'jimautos.cl', 'jmc': 'jmcmotors.cl',
        'kaiyi': 'kaiyichile.cl', 'nammi': 'nammi.cl', 'riddara': 'riddara.cl',
        'swm': 'swmmotors.cl', 'voltera': 'voltera.cl', 'fuso': 'fuso.cl'
    };
    const domain = domainMap[normalized] || `${normalized.replace(/\s+/g, '')}.com`;
    return `https://logo.clearbit.com/${domain}?size=128`;
}

// Load env vars
// Default to parsing the generated client file where credentials are baked in
let SUPABASE_URL = process.env.VITE_SUPABASE_URL;
let SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    try {
        const clientPath = path.join(__dirname, '../src/integrations/supabase/client.ts');
        const clientFile = fs.readFileSync(clientPath, 'utf8');
        SUPABASE_URL = clientFile.match(/const SUPABASE_URL = "(.*)"/)?.[1] || clientFile.match(/const SUPABASE_URL = '(.*)'/)?.[1];

        // Try to get service role key from env, otherwise fallback to anon key for reading
        const envPath = path.join(__dirname, '../.env.local');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            SUPABASE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1];
        }

        if (!SUPABASE_KEY) {
            SUPABASE_KEY = clientFile.match(/const SUPABASE_PUBLISHABLE_KEY = "(.*)"/)?.[1] || clientFile.match(/const SUPABASE_PUBLISHABLE_KEY = '(.*)'/)?.[1];
        }
    } catch (e) {
        // file not found or regex fail
    }
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Missing Supabase credentials. Could not extract them from environment or client.ts");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper to check if an image is invisible 1x1 
// (For Clearbit fallback) -> We just skip and fail the fetch if it's less than ~150 bytes (1x1 PNG/GIF)
async function fetchAndDetectRealImage(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const buffer = await res.buffer();
        // Clearbit 1x1 invisible transparent PNGs are roughly 68 to 150 bytes.
        if (buffer.length < 200) {
            return null;
        }
        const contentType = res.headers.get('content-type');
        let ext = 'png';
        if (contentType.includes('svg')) ext = 'svg';
        else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
        return { buffer, ext, contentType };
    } catch (e) {
        return null; // failed to fetch
    }
}

async function run() {
    console.log("Analyzing live database for unique brands...");

    // Extract unique brands by getting all names from the database directly
    const { data: products, error: prodErr } = await supabase
        .from('products')
        .select('brand');

    if (prodErr || !products) {
        console.error("Failed to fetch brands from DB:", prodErr);
        return;
    }

    const brands = new Set();
    products.forEach(p => {
        if (p.brand && p.brand.trim()) brands.add(p.brand.trim().toUpperCase());
    });

    const uniqueBrands = Array.from(brands).sort();
    console.log(`Found ${uniqueBrands.length} unique brands to process.`);

    let successCount = 0;

    for (const brand of uniqueBrands) {
        console.log(`\n--- Processing [${brand}] ---`);

        // 1. Check if it's already in the DB
        const { data: existingBrand } = await supabase
            .from('brand_logos')
            .select('*')
            .eq('brand_name', brand)
            .single();

        if (existingBrand) {
            console.log(`✅ ${brand} already exists in DB. Skipping.`);
            continue;
        }

        // 2. Try to locate a valid logo
        let logoFile = null;
        let sourceUrl = null;

        // Try SVG
        const svgUrl = getBrandSvgUrl(brand);
        console.log(`  Trying SVG: ${svgUrl}`);
        logoFile = await fetchAndDetectRealImage(svgUrl);

        if (logoFile) {
            sourceUrl = svgUrl;
            console.log("  ✅ SVG Found.");
        } else {
            // Try PNG Map
            const pngUrl = getBrandLogo(brand);
            if (pngUrl) {
                console.log(`  Trying PNG Map: ${pngUrl}`);
                logoFile = await fetchAndDetectRealImage(pngUrl);
            }
            if (logoFile) {
                sourceUrl = pngUrl;
                console.log("  ✅ Config Map PNG Found.");
            } else {
                // Try Clearbit
                const clearbitUrl = getClearbitLogoUrl(brand);
                console.log(`  Trying Clearbit: ${clearbitUrl}`);
                logoFile = await fetchAndDetectRealImage(clearbitUrl);

                if (logoFile) {
                    sourceUrl = clearbitUrl;
                    console.log("  ✅ Clearbit Logo Found.");
                }
            }
        }

        if (!logoFile) {
            console.log(`❌ Failed to find any visual logo for [${brand}].`);
            continue; // We just skip adding to DB so the UI naturally falls back to text initials.
        }

        // 3. Upload to Supabase Storage
        const normalizedBrandFile = brand.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const filePath = `${normalizedBrandFile}.${logoFile.ext}`;

        console.log(`  Uploading to storage: ${filePath}...`);
        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('brand-logos')
            .upload(filePath, logoFile.buffer, {
                contentType: logoFile.contentType,
                upsert: true
            });

        if (uploadError) {
            console.error(`  ❌ Storage Error:`, uploadError);
            continue;
        }

        // 4. Get Public URL
        const { data: { publicUrl } } = supabase
            .storage
            .from('brand-logos')
            .getPublicUrl(filePath);

        // 5. Insert to DB
        console.log(`  Inserting into DB -> ${publicUrl}`);
        const { error: dbError } = await supabase
            .from('brand_logos')
            .insert([{ brand_name: brand, image_url: publicUrl }]);

        if (dbError) {
            console.error(`  ❌ DB Insert Error:`, dbError);
        } else {
            successCount++;
        }
    }

    console.log(`\n🎉 Processed ${successCount}/${uniqueBrands.length} logos successfully.`);
}

run();
