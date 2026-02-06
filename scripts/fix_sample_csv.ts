
import * as fs from 'fs';
import Papa from 'papaparse';
import * as crypto from 'crypto';

const inputFile = 'public/SAMPLE.csv';
const outputFile = 'public/SAMPLE_READY_V2.csv';

const cleanNumber = (val: string) => {
    if (!val) return '';
    let s = val.toString().trim();
    s = s.replace(/[$\sA-Za-z]/g, '');
    s = s.replace(/\./g, '');
    s = s.replace(/,/g, '.');
    return s;
};

const fixDate = (val: string) => {
    if (!val) return new Date().toISOString().split('T')[0];
    const s = val.trim();
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
        const [d, m, y] = s.split('-');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return s;
};

const inferType = (row: any) => {
    // Priority: Existing Type -> Model Principal -> Model (Trim)
    if (row['Tipo_Vehiculo'] && row['Tipo_Vehiculo'].length > 2 && row['Tipo_Vehiculo'] !== 'Sin Clasificar') return row['Tipo_Vehiculo'];

    const text = (row['Modelo Principal'] + ' ' + row['Modelo'] + ' ' + row['Categoría']).toLowerCase();

    // SUV / 4x4
    if (text.match(/suv|x-trail|kicks|qashqai|tiguan|rexton|explorer|santa fe|palisade|cr-v|outback|fortuner|cx-60|cx-5|cx-30|cx-9|t-cross|nivus|taos|atlas|terracan|tucson|creta/)) return 'SUV';

    // Pick-up
    if (text.match(/pick|np300|navara|hilux|ranger|l200|amarok|bt-50|poer|t60|t90|silverado|ram/)) return 'Pick up';

    // Sedan
    if (text.match(/sedan|sentra|versa|mazda3|mazda 3|corolla|yaris|cerato|rio|accent|elantra|impreza/)) return 'Sedan';

    // Hatchback / City Car
    if (text.match(/hatchback|city|morning|spark|swift|baleno|ignis|march|208|308|clio|kwid/)) return 'Hatchback';

    // Commercial
    if (text.match(/van|partner|berlingo|boxer|ducato|transit|sprinter/)) return 'Comercial';

    return 'Sin Clasificar';
};

const generateUID = () => {
    return crypto.randomBytes(6).toString('hex');
};

const generateIDBase = (brand: string, model: string, submodel: string) => {
    const slug = (str: string) => str ? str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'unknown';
    return `${slug(brand)}|${slug(model)}|${slug(submodel)}`;
};

const run = () => {
    try {
        let content = fs.readFileSync(inputFile, 'utf-8');
        if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

        const firstLine = content.split('\n')[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';

        const parsed = Papa.parse(content, {
            header: true,
            delimiter: delimiter,
            skipEmptyLines: true
        });

        const rows = parsed.data;
        const newRows = rows.map((row: any) => {
            const cat = row['Categoría'] || row['Marca'] || 'Nissan';
            const model = row['Modelo'] || '';
            const principal = row['Modelo Principal'] || model;
            const submodel = row['Submodelo'] || model;
            const price = cleanNumber(row['precio_num'] || row['precio']);
            const listPrice = cleanNumber(row['precio_lista_num']);

            const finalUID = row['UID'] || generateUID();
            const finalIDBase = row['ID_Base'] || generateIDBase(cat, principal, submodel);

            return {
                UID: finalUID,
                ID_Base: finalIDBase,
                'Categoría': cat,
                'Modelo Principal': principal,
                'Modelo': model,
                'Submodelo': submodel,
                'ctx_precio': row['ctx_precio'] || 'financiamiento:marca',
                'precio_num': price,
                'precio_lista_num': listPrice || price,
                'bono_num': cleanNumber(row['bono_num']) || '0',
                'Precio_Texto': `$${Number(price).toLocaleString('es-CL')}`,
                'fuente_texto_raw': row['fuente_texto_raw'] || '',
                'Modelo_URL': row['Modelo_URL'] || '',
                'Archivo_Origen': 'SAMPLE_FIXED.csv',
                'Fecha': fixDate(row['Fecha']),
                'Timestamp': row['Timestamp'] || new Date().toISOString(),
                'estado': 'vigente',
                'Tipo_Vehiculo': inferType(row)
            };
        });

        const csv = Papa.unparse(newRows, {
            delimiter: ',',
            header: true,
            quotes: true
        });

        fs.writeFileSync(outputFile, csv, 'utf-8');
        console.log(`Generated ${outputFile} with Smart Classification.`);

    } catch (e) {
        console.error("Error:", e);
    }
};

run();
