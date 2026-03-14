/**
 * formatCsvForUpload.js
 * 
 * Transforms cliente_historico_FINAL_v4_norm.csv from its source format to
 * the expected upload format (comma-delimited, correct column order, clean data).
 * 
 * Issues fixed:
 * - Delimiter: ; → ,
 * - Dates: DD-MM-YYYY → YYYY-MM-DD
 * - Timestamps: generated from date
 * - ctx_precio: fill empty with "financiamiento:marca"
 * - estado: fill empty with "vigente"
 * - Precio_Texto: format as $XX.XXX.XXX
 * - UID: clean scientific notation (e.g., 6,51635E+11)
 * - Prices with comma decimals → round to integer
 * - Column order matches target schema
 * - ID_Base: lowercase + replace spaces with dashes
 * - Add fuente_texto_raw and Modelo_URL as empty if missing
 */

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../public/cliente_historico_FINAL_v4_norm.csv');
const outputFile = path.join(__dirname, '../public/cliente_historico_FINAL_v4_norm_READY.csv');

// Parse a semicolon-delimited line respecting quotes
function parseLine(line) {
  const result = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ';' && !inQuote) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// Convert DD-MM-YYYY or DD/MM/YYYY → YYYY-MM-DD
function convertDate(raw) {
  if (!raw) return '';
  const clean = raw.trim();
  // Already in YYYY-MM-DD format?
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  // DD-MM-YYYY or DD/MM/YYYY
  const m = clean.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const mon = m[2].padStart(2, '0');
    const year = m[3];
    return `${year}-${mon}-${day}`;
  }
  return clean;
}

// Generate ISO timestamp from a YYYY-MM-DD date
function makeTimestamp(dateStr) {
  if (!dateStr) return new Date().toISOString();
  return new Date(dateStr + 'T10:00:00.000Z').toISOString();
}

// Parse price that may have comma as decimal separator → integer
function parsePrice(raw) {
  if (!raw && raw !== 0) return 0;
  // Replace comma decimal with dot, then parse float → round
  const cleaned = String(raw).replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
}

// Format price as $XX.XXX.XXX
function formatPrecioTexto(num) {
  if (!num) return '';
  return '$' + num.toLocaleString('es-CL');
}

// Clean UID: if it looks like scientific notation (contains 'E+' or 'e+' or has commas as thousands)
function cleanUID(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  // Excel scientific notation like "6,51635E+11" or "6.51635E+11"
  if (/^[\d,.]+(E|e)[+\-]\d+$/.test(s)) {
    // Convert to number and back to uppercase hex if possible
    // Try to parse as number
    const normalized = s.replace(',', '.');
    const num = parseFloat(normalized);
    if (!isNaN(num) && isFinite(num)) {
      // Convert to hex string, uppercase, take last 12 chars
      const hexStr = Math.round(num).toString(16).toUpperCase();
      return hexStr.padStart(12, '0').slice(-12);
    }
    return s.replace(',', '').replace('.', '').padStart(12, '0').slice(-12);
  }
  // Already looks like a valid hex UID
  return s;
}

// Build ID_Base from brand + model + version: lowercase, spaces to dashes
function buildIDBase(idBase, brand, model, version) {
  // If id_base is already formatted (contains |), keep it
  if (idBase && idBase.includes('|')) return idBase;
  
  // If it's a short hash (no |), rebuild from brand|model|version
  const b = (brand || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  const m = (model || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  const v = (version || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  return `${b}|${m}|${v}`;
}

// Escape a field for CSV output
function csvField(val) {
  const s = String(val === null || val === undefined ? '' : val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

const raw = fs.readFileSync(inputFile, 'utf-8');
// Remove BOM if present
const content = raw.startsWith('\ufeff') ? raw.slice(1) : raw;

const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');
const header = parseLine(lines[0]);

console.log('Input columns:', header);
console.log('Total data rows:', lines.length - 1);

// Map column indices
const idx = {};
header.forEach((col, i) => { idx[col] = i; });

// Output header (target format)
const outputHeader = [
  'UID', 'ID_Base', 'Categoría', 'Modelo Principal', 'Modelo', 'Submodelo',
  'ctx_precio', 'precio_num', 'precio_lista_num', 'bono_num',
  'Precio_Texto', 'fuente_texto_raw', 'Modelo_URL', 'Archivo_Origen',
  'Fecha', 'Timestamp', 'estado', 'Tipo_Vehiculo'
];

const outputLines = [outputHeader.map(csvField).join(',')];

let skipped = 0;
let processed = 0;

for (let i = 1; i < lines.length; i++) {
  const row = parseLine(lines[i]);
  if (row.length < 5) { skipped++; continue; }

  const rawUID       = row[idx['UID']] || '';
  const rawIDBase    = row[idx['ID_Base']] || '';
  const brand        = (row[idx['Categoría']] || '').trim();
  const modelPrinc   = (row[idx['Modelo Principal']] || '').trim();
  const modelo       = (row[idx['Modelo']] || '').trim();
  const submodelo    = (row[idx['Submodelo']] || '').trim();
  const rawCtx       = (row[idx['ctx_precio']] || '').trim();
  const rawPrecio    = row[idx['precio_num']] || '0';
  const rawLista     = row[idx['precio_lista_num']] || '0';
  const rawBono      = row[idx['bono_num']] || '0';
  const rawFuente    = (row[idx['fuente_texto_raw']] || '').trim();
  const rawURL       = (row[idx['Modelo_URL']] || '').trim();
  const rawArchivo   = (row[idx['Archivo_Origen']] || '').trim();
  const rawFecha     = (row[idx['Fecha']] || '').trim();
  const rawEstado    = (row[idx['estado']] || '').trim();
  const rawTipo      = (row[idx['Tipo_Vehiculo']] || '').trim();

  const uid         = cleanUID(rawUID) || rawUID;
  const idBase      = buildIDBase(rawIDBase, brand, modelPrinc, modelo);
  const ctxPrecio   = rawCtx || 'financiamiento:marca';
  const precioNum   = parsePrice(rawPrecio);
  const listaNum    = parsePrice(rawLista);
  const bonoNum     = parsePrice(rawBono);
  const precioTexto = formatPrecioTexto(precioNum);
  const fecha       = convertDate(rawFecha);
  const timestamp   = makeTimestamp(fecha);
  const estado      = rawEstado || 'vigente';

  const outRow = [
    uid, idBase, brand, modelPrinc, modelo, submodelo,
    ctxPrecio, precioNum, listaNum, bonoNum,
    precioTexto, rawFuente, rawURL, rawArchivo,
    fecha, timestamp, estado, rawTipo
  ];

  outputLines.push(outRow.map(csvField).join(','));
  processed++;
}

fs.writeFileSync(outputFile, outputLines.join('\r\n'), 'utf-8');

console.log(`\n✅ Done!`);
console.log(`   Processed: ${processed} rows`);
console.log(`   Skipped:   ${skipped} rows`);
console.log(`   Output:    ${outputFile}`);
