
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';

// --- Configuration ---
const INPUT_FILE = '../public/dataset_autos_completo (1).csv';
const OUTPUT_FILE = '../public/dataset_autos_completo_READY.csv';
const DELIMITER = ','; // Comma for this file

// --- Utils ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cleanNumber = (val: string) => {
    if (!val) return '0';
    return String(val).replace(/[^0-9]/g, '');
};

// Title Case Helper (Same as fix_sample_3)
const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => {
        if (word.length === 0) return '';
        if (['y', 'de', 'del', 'la', 'el', 'los', 'las', 'en'].includes(word.toLowerCase())) return word; // connectors
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
};

const generateUID = () => {
    return Math.random().toString(36).substring(2, 15);
};

const generateIDBase = (brand: string, model: string, version: string) => {
    const slug = (str: string) => str ? str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'unknown';
    // Using VERSION (Modelo) as the 3rd slug component to ensure uniqueness
    return `${slug(brand)}|${slug(model)}|${slug(version)}`;
};

const inferType = (row: any) => {
    if (row['Tipo_Vehiculo'] && row['Tipo_Vehiculo'].length > 2) return row['Tipo_Vehiculo'];
    const text = (String(row['Modelo Principal'] || '') + ' ' + String(row['Modelo'] || '') + ' ' + String(row['Categoría'] || '')).toLowerCase();

    if (text.match(/suv|x-trail|kicks|qashqai|tiguan|rexton|explorer|santa fe|palisade|cr-v|outback|fortuner|cx-60|cx-5|cx-30|cx-9|t-cross|nivus|taos|atlas|terracan|tucson|creta|sportage|sorento/)) return 'SUV';
    if (text.match(/pick|np300|navara|hilux|ranger|l200|amarok|bt-50|poer|t60|t90|silverado|ram/)) return 'Pick up';
    if (text.match(/sedan|sentra|versa|mazda3|mazda 3|corolla|yaris|cerato|rio|accent|elantra|impreza/)) return 'Sedan';
    if (text.match(/hatchback|city|morning|spark|swift|baleno|ignis|march|208|308|clio|kwid/)) return 'Hatchback';
    if (text.match(/van|partner|berlingo|boxer|ducato|transit|sprinter/)) return 'Comercial';

    return 'Sin Clasificar';
};

const fixDate = (val: any): string => {
    if (!val) return new Date().toISOString().split('T')[0];
    if (typeof val === 'number') {
        const date = new Date(Math.round((val - 25569) * 864e5));
        return date.toISOString().split('T')[0];
    }
    const s = String(val).trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(s)) {
        const parts = s.split(/[-/]/);
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return s;
};

// --- Main ---
const processCSV = () => {
    const inputPath = path.join(__dirname, INPUT_FILE);
    const outputPath = path.join(__dirname, OUTPUT_FILE);

    console.log(`Reading CSV: ${INPUT_FILE}`);
    const fileContent = fs.readFileSync(inputPath, 'utf-8');

    Papa.parse(fileContent, {
        header: true,
        delimiter: DELIMITER,
        skipEmptyLines: true,
        complete: (results) => {
            const data = results.data;
            const outputData: any[] = [];

            // Find key mappings (loose matching)
            const headers = results.meta.fields || [];
            const findKey = (candidates: string[]) => headers.find(h => candidates.some(c => h.toLowerCase().includes(c.toLowerCase())));

            const principalKey = findKey(['Modelo Principal', 'Principal']) || 'Modelo Principal';
            const modelKey = findKey(['Modelo', 'Version']) || 'Modelo'; // The distinct version column
            const submodelKey = findKey(['Submodelo', 'Subversion']) || 'Submodelo';
            const catKey = findKey(['Categoría', 'Brand', 'Marca']) || 'Categoría';

            console.log(`Mapping: Principal=${principalKey}, Version=${modelKey}, Submodel=${submodelKey}`);

            data.forEach((row: any) => {
                if (!row[principalKey] && !row[modelKey]) return;

                const rawCat = row[catKey] || 'Generico';
                const rawPrincipal = row[principalKey] || '';
                const rawModel = row[modelKey] || '';
                const rawSubmodel = row[submodelKey] || '';

                // Logic: Title Case Principal, Keep Version Raw
                const cat = rawCat;
                const principal = toTitleCase(rawPrincipal);
                const model = rawModel;
                const submodel = rawSubmodel;

                const price = cleanNumber(row['precio_num'] || row['precio'] || '0');
                const listPrice = cleanNumber(row['precio_lista_num'] || row['precio_lista'] || price);
                const bono = cleanNumber(row['bono_num'] || '0');

                // Generate ID using VERSION (model) to avoid collision
                const finalUID = row['UID'] || generateUID();
                const finalIDBase = generateIDBase(cat, principal, model);

                const fixedDate = fixDate(row['Fecha'] || row['Date']);
                const type = inferType({ ...row, 'Modelo Principal': principal, 'Modelo': model, 'Categoría': cat });

                outputData.push({
                    UID: finalUID,
                    ID_Base: finalIDBase,
                    'Categoría': cat,
                    'Modelo Principal': principal,
                    'Modelo': model,
                    'Submodelo': submodel,
                    'ctx_precio': row['ctx_precio'] || 'financiamiento:marca',
                    'precio_num': price,
                    'precio_lista_num': listPrice,
                    'bono_num': bono,
                    'Precio_Texto': `$${Number(price).toLocaleString('es-CL')}`,
                    'fuente_texto_raw': row['fuente_texto_raw'] || '',
                    'Modelo_URL': row['Modelo_URL'] || '',
                    'Archivo_Origen': 'dataset_autos_completo_revised.csv',
                    'Fecha': fixedDate,
                    'Timestamp': new Date().toISOString(),
                    'estado': 'vigente',
                    'Tipo_Vehiculo': type
                });
            });

            console.log(`Processed ${outputData.length} rows.`);
            const csv = Papa.unparse(outputData, { quotes: true, delimiter: ',' }); // Output always comma + quotes
            fs.writeFileSync(outputPath, csv);
            console.log(`Wrote to: ${OUTPUT_FILE}`);
        }
    });
};

processCSV();
