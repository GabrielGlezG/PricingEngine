
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../public/dataset_autos_completo (1).csv');

try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split(/\r?\n/);

    // Header should be line 0.
    const header = lines[0].split(',');
    const idIndex = header.indexOf('ID_Base');

    if (idIndex === -1) {
        console.log("Error: ID_Base column not found in header.");
        process.exit(1);
    }

    const idCounts: Record<string, number> = {};
    const metadata: Record<string, any> = {};

    let dataRows = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV split (handling quotes crudely or assuming ID has no commas)
        // IDs are usually 'brand|model|...' so no commas.
        const cols = line.split(',');

        // If row is malformed (multiline), we might skip or get garbage.
        if (cols.length < idIndex + 1) continue;

        const id = cols[idIndex];

        // Skip header repetition or empty IDs
        if (id === 'ID_Base' || !id) continue;

        if (idCounts[id]) {
            idCounts[id]++;
        } else {
            idCounts[id] = 1;
            // Store Metadata for debugging (Model/Submodel)
            // Model Principal index?
            metadata[id] = { line: i + 1, raw: line };
        }
        dataRows++;
    }

    const duplicates = Object.keys(idCounts).filter(id => idCounts[id] > 1);

    console.log(`Scanned ${dataRows} rows.`);
    console.log(`Found ${duplicates.length} duplicate IDs.`);

    if (duplicates.length > 0) {
        console.log(" Top 5 Duplicates:");
        duplicates.slice(0, 5).forEach(id => {
            console.log(` - ${id}: ${idCounts[id]} occurrences`);
        });
    } else {
        console.log("SUCCESS: No duplicate IDs found.");
    }

} catch (err) {
    console.error("Error reading file:", err);
}
