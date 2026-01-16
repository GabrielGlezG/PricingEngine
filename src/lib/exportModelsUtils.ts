
import { saveAs } from "file-saver";
// @ts-ignore
import XlsxPopulate from 'xlsx-populate/browser/xlsx-populate';
import { ModelData } from "./fetchModelsData";

// Re-using common styles/helpers if needed, or defining local ones for simplicity
const COLORS = {
    header: "1E293B",
    headerText: "FFFFFF",
    altRow: "F1F5F9",
    border: "E2E8F0"
};

export const exportModelsTableToExcel = async (
    modelsData: ModelData[],
    filters: any,
    currencySymbol: string = "$"
) => {
    if (!modelsData || modelsData.length === 0) return;

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Catalogo_Combinado_${dateStr}.xlsx`;

    try {
        console.log("[Export Models] Using local generation for Models Table...");
        const workbook = await XlsxPopulate.fromBlankAsync();
        const currencyFmt = currencySymbol === "UF" ? `"${currencySymbol}" #,##0.00` : `"${currencySymbol}" #,##0`;

        const ws = workbook.sheet(0).name("Catálogo Combinado");

        // Title and Info
        ws.cell("A1").value("REPORTE DE CATÁLOGO COMBINADO").style({ bold: true, fontSize: 16 });
        ws.cell("A2").value(`Generado: ${new Date().toLocaleDateString()}`).style({ italic: true, fontColor: "666666" });

        // Filters Info
        let row = 4;
        if (filters) {
            ws.cell(row, 1).value("Filtros Aplicados:").style({ bold: true });
            row++;
            Object.entries(filters).forEach(([key, val]) => {
                if (val && (Array.isArray(val) ? val.length > 0 : true)) {
                    ws.cell(row, 1).value(`${key}:`);
                    // @ts-ignore
                    ws.cell(row, 2).value(Array.isArray(val) ? val.join(", ") : val);
                    row++;
                }
            });
        }
        row += 1; // Spacing

        // Headers
        const headers = ["Marca", "Modelo", "Versión", "Estado", "Tipo Vehículo", "Precio c/Bono", "Precio Lista", "Bono", "% Descuento"];
        const headerRow = row;

        headers.forEach((h, i) => {
            ws.cell(headerRow, i + 1).value(h).style({
                bold: true,
                fill: COLORS.header,
                fontColor: COLORS.headerText,
                horizontalAlignment: "center",
                border: true
            });
        });

        // Data
        row++;
        modelsData.forEach((m, i) => {
            const r = row + i;
            const isAlt = i % 2 === 1;

            // Calculate Discount % (Bono / Precio Lista)
            const discountPct = (m.bono && m.precio_lista && m.precio_lista > 0)
                ? (m.bono / m.precio_lista) : 0;

            const style = {
                fill: isAlt ? COLORS.altRow : "FFFFFF",
                border: { color: COLORS.border }
            };

            ws.cell(r, 1).value(m.brand).style(style);
            ws.cell(r, 2).value(m.model).style(style);
            ws.cell(r, 3).value(m.submodel || '-').style(style);
            ws.cell(r, 4).value(m.estado || 'N/A').style(style);
            ws.cell(r, 5).value(m.tipo_vehiculo || 'N/A').style(style);
            ws.cell(r, 6).value(m.precio_con_bono || 0).style(style).style("numberFormat", currencyFmt);
            ws.cell(r, 7).value(m.precio_lista || 0).style(style).style("numberFormat", currencyFmt);
            ws.cell(r, 8).value(m.bono || 0).style(style).style("numberFormat", currencyFmt);
            ws.cell(r, 9).value(discountPct).style(style).style("numberFormat", "0.0%");
        });

        // Auto-width columns (Approximation)
        const widths = [15, 20, 25, 12, 15, 18, 18, 15, 15];
        widths.forEach((w, i) => ws.column(i + 1).width(w));

        const blob = await workbook.outputAsync();
        saveAs(blob, filename);
        console.log("[Export Models] ✓ Export completed");

    } catch (error) {
        console.error("[Export Models] Failed:", error);
        alert("Error al exportar catálogo.");
    }
};
