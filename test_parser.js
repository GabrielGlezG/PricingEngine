
// Logic copied exactly from supabase/functions/upload-json/index.ts

const parseFinancialNumber = (val) => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return val;

    let str = String(val).trim();
    // 1. Remove currency symbols and spaces
    let clean = str.replace(/[$\sA-Za-z]/g, '');

    // 2. Check strict integer format with dots (common in Latin America/Europe for millions)
    if (clean.includes('.') && !clean.includes(',')) {
        // If multiple dots (26.290.000) -> Remove all dots
        if ((clean.match(/\./g) || []).length > 1) {
            clean = clean.replace(/\./g, '');
        }
        // If single dot (26.290), ambiguous. Could be 26.29 or 26290.
        // Context: Cars cost > 1000. So 26.290 is likely 26290.
        else if (clean.length > 5) { // Heuristic
            clean = clean.replace(/\./g, '');
        }
    }

    // 3. Fallback: Parse float normally after cleaning
    // If it has commas, replace with dot for JS
    clean = clean.replace(/,/g, '.');

    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
}

const testCases = [
    "26.290.000",   // Target Case (Excel string)
    "27.090.000",   // Target Case
    "800.000",      // Target Case
    "$ 26.290.000", // With Symbol
    "26290000",     // Plain
    "26,290,000",   // English format
    "26.290,00"     // Decimal format (Europe/Latam)
];

console.log("Testing Parsing Logic:");
testCases.forEach(input => {
    console.log(`Input: "${input}" \t-> Cleaned: ${parseFinancialNumber(input)}`);
});
