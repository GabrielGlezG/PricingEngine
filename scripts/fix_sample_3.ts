
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const inputDir = 'public';
const inputFileXlsx = 'SAMPLE (3).xlsx';
const inputFileCsv = 'SAMPLE (3).csv';
const outputFile = 'public/SAMPLE_READY_V3.csv';

const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toString().toLowerCase().split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
};

const cleanNumber = (val: any) => {
    if (!val) return '';
    let s = val.toString().trim();
    s = s.replace(/[$\sA-Za-z]/g, '');
    // If it looks like 26.290.000, remove dots
    if (s.includes('.') && s.split('.').length > 1) {
        s = s.replace(/\./g, '');
    }
    s = s.replace(/,/g, '.');
    return s;
};

const fixDate = (val: any) => {
    if (!val) return new Date().toISOString().split('T')[0];

    // Check if Excel serial date (number)
    if (typeof val === 'number') {
        const date = new Date(Math.round((val - 25569) * 864e5));
        return date.toISOString().split('T')[0];
    }

    const s = String(val).trim();
    // DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(s)) {
        const parts = s.split(/[-/]/);
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return s; // Assume ISO or let it fail
};

const inferType = (row: any) => {
    // Reuse logic
    const text = ((row['Modelo Principal'] || '') + ' ' + (row['Modelo'] || '') + ' ' + (row['Categoría'] || '')).toLowerCase();

    if (text.match(/suv|x-trail|kicks|qashqai|tiguan|rexton|explorer|santa fe|palisade|cr-v|outback|fortuner|cx-60|cx-5|cx-30|cx-9|t-cross|nivus|taos|atlas|terracan|tucson|creta/)) return 'SUV';
    if (text.match(/pick|np300|navara|hilux|ranger|l200|amarok|bt-50|poer|t60|t90|silverado|ram/)) return 'Pick up';
    if (text.match(/sedan|sentra|versa|mazda3|mazda 3|corolla|yaris|cerato|rio|accent|elantra|impreza/)) return 'Sedan';
    if (text.match(/hatchback|city|morning|spark|swift|baleno|ignis|march|208|308|clio|kwid/)) return 'Hatchback';
    if (text.match(/van|partner|berlingo|boxer|ducato|transit|sprinter/)) return 'Comercial';

    return 'Sin Clasificar';
};

const generateUID = () => crypto.randomBytes(6).toString('hex');

const generateIDBase = (brand: string, model: string, submodel: string) => {
    const slug = (str: string) => str ? str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'unknown';
    return `${slug(brand)}|${slug(model)}|${slug(submodel)}`;
};

const run = () => {
    try {
        let rows: any[] = [];
        let filePath = path.join(inputDir, inputFileXlsx);

        // Check XLSX first, then CSV
        if (fs.existsSync(filePath)) {
            console.log(`Reading XLSX: ${filePath}`);
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        } else {
            filePath = path.join(inputDir, inputFileCsv);
            if (fs.existsSync(filePath)) {
                console.log(`Reading CSV: ${filePath}`);
                let content = fs.readFileSync(filePath, 'utf-8');
                if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
                // Simple sniff: count delimiters in first line
                const line1 = content.split('\n')[0];
                const commas = (line1.match(/,/g) || []).length;
                const semis = (line1.match(/;/g) || []).length;
                const delim = semis > commas ? ';' : ',';
                console.log(`Detected delimiter: '${delim}'`);

                const parsed = Papa.parse(content, { header: true, delimiter: delim });
                rows = parsed.data;
            } else {
                console.error("Neither XLSX nor CSV found for SAMPLE (3)");
                return;
            }
        }

        const newRows = rows.map((row: any) => {
            // Find keys loosely
            const findKey = (candidates: string[]) => candidates.find(c => Object.keys(row).find(k => k.trim().toLowerCase() === c.toLowerCase()));

            const catKey = findKey(['Categoría', 'Marca', 'BAND']) || 'Categoría';
            const modelKey = findKey(['Modelo', 'MODEL']) || 'Modelo';
            const principalKey = findKey(['Modelo Principal']) || modelKey;
            const submodelKey = findKey(['Submodelo', 'Version']) || modelKey;

            const rawCat = row[catKey] || 'Nissan';
            const rawPrincipal = row[principalKey] || '';
            const rawModel = row[modelKey] || '';
            const rawSubmodel = row[submodelKey] || '';

            // Apply Title Case only to Modelo Principal (User calls this 'Modelo')
            const cat = rawCat;
            const principal = toTitleCase(rawPrincipal);
            const model = rawModel;
            const submodel = rawSubmodel;

            const priceVal = row['precio_num'] || row['precio'] || row['PRICE'] || '0';
            const price = cleanNumber(priceVal);
            const listPrice = cleanNumber(row['precio_lista_num'] || row['LIST_PRICE'] || price);
            const bono = cleanNumber(row['bono_num'] || row['BONUS'] || '0');

            const finalUID = row['UID'] || generateUID();
            const finalIDBase = row['ID_Base'] || generateIDBase(cat, principal, model);

            // Fecha
            const rawDate = row['Fecha'] || row['DATE'] || row['date'];
            const fixedDate = fixDate(rawDate);

            return {
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
                'Archivo_Origen': 'SAMPLE_3_FIXED.csv',
                'Fecha': fixedDate,
                'Timestamp': new Date().toISOString(),
                'estado': 'vigente',
                'Tipo_Vehiculo': inferType({ ...row, 'Modelo Principal': rawPrincipal, 'Modelo': rawModel, 'Categoría': rawCat })
            };
        });

        // Filter empty rows (where price is missing or 0, or just empty objects)
        const validRows = newRows.filter(r => r['precio_num'] && r['precio_num'] !== '0' && r['Categoría']);

        console.log(`Processing complete. Original: ${rows.length}, Valid: ${validRows.length}`);

        if (validRows.length > 0) {
            const csv = Papa.unparse(validRows, {
                delimiter: ',',
                header: true,
                quotes: true
            });
            fs.writeFileSync(outputFile, csv, 'utf-8');
            console.log(`Generated ${outputFile}`);
        } else {
            console.error("No valid rows found to write.");
        }

    } catch (e) {
        console.error("Error:", e);
    }
};

run();
