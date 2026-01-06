// @ts-ignore
import XlsxPopulate from 'xlsx-populate/browser/xlsx-populate';
import { saveAs } from "file-saver";
import { ModelData } from "./fetchModelsData";

interface Metric {
    total_models: number;
    total_brands: number;
    avg_price: number;
    min_price: number;
    max_price: number;
    median_price: number;
    price_std_dev: number;
    variation_coefficient: number;
    generated_at?: string;
}

interface AnalyticsData {
    metrics: Metric;
    chart_data: {
        models_by_category: Array<{ category: string; count: number }>;
        prices_by_brand: Array<{ brand: string; avg_price: number; min_price: number; max_price: number; count: number }>;
        prices_by_category: Array<{ category: string; avg_price: number; min_price: number; max_price: number }>;
        models_by_principal: Array<{ model_principal: string; count: number; avg_price: number; min_price: number; max_price: number }>;
        brand_variations: Array<{ brand: string; variation_percent: number; startDate?: string; endDate?: string }>;
        volatility_timeseries: Array<{ entity: string; data: Array<{ date: string; variation: number; avg_price: number }> }>;
        prices_by_segment_breakdown?: Record<string, Array<{ brand: string; avg_price: number }>>;
    };
    generated_at: string;
    available_dates?: string[];
}

export interface ExportContext {
    filters: {
        tipoVehiculo: string[];
        brand: string[];
        model: string[];
        submodel: string[];
    };
    volatilityBrands?: string[];
    volatilityPeriod?: string;
}

export const exportDashboardToExcel = async (
    data: AnalyticsData,
    context: ExportContext,
    currencySymbol: string = "$",
    convertPrice: (price: number) => number = (p) => p,
    modelsData?: ModelData[]
) => {
    if (!data) return;

    try {
        console.log("Loading Dashboard Template...");
        const response = await fetch('/dashboard_template.xlsx');
        if (!response.ok) {
            throw new Error(`Template not found (${response.status}). Ensure 'dashboard_template.xlsx' is in public folder.`);
        }
        const buffer = await response.arrayBuffer();
        const workbook = await XlsxPopulate.fromDataAsync(buffer);

        // Helper to fill table data with auto-clearing
        const fillTable = (sheetName: string, rows: any[][], startRow: number = 2, startCol: number = 1) => {
            const sheet = workbook.sheet(sheetName);
            if (!sheet) {
                console.warn(`Sheet '${sheetName}' not found in template.`);
                return;
            }

            // Clear existing data (rows 2 to 500, cols 1 to 10) to remove template text
            // This ensures "other brands" (dummy data) don't appear
            try {
                // Determine max columns based on input or default to a safe number
                const numCols = rows.length > 0 ? rows[0].length : 10;
                sheet.range(startRow, startCol, startRow + 500, startCol + numCols - 1).value(null);
            } catch (e) {
                console.warn("Error clearing range:", e);
            }

            // Write data
            rows.forEach((row, r) => {
                row.forEach((val, c) => {
                    sheet.row(startRow + r).cell(startCol + c).value(val);
                });
            });
        };

        // Helper to format currency
        const currencyFmt = currencySymbol === "UF" ? `"${currencySymbol}" #,##0.00` : `"${currencySymbol}" #,##0`;

        // 1. Resumen Ejecutivo
        const wsSummary = workbook.sheet("Resumen Ejecutivo");
        if (wsSummary) {
            // Write Metrics
            wsSummary.cell("B2").value(data.metrics.total_models);
            wsSummary.cell("B3").value(data.metrics.total_brands);
            wsSummary.cell("B4").value(convertPrice(data.metrics.avg_price)).style("numberFormat", currencyFmt);
            wsSummary.cell("B5").value(convertPrice(data.metrics.median_price)).style("numberFormat", currencyFmt);
            wsSummary.cell("B6").value(convertPrice(data.metrics.min_price)).style("numberFormat", currencyFmt);
            wsSummary.cell("B7").value(convertPrice(data.metrics.max_price)).style("numberFormat", currencyFmt);
            wsSummary.cell("B8").value(convertPrice(data.metrics.price_std_dev)).style("numberFormat", currencyFmt);
            wsSummary.cell("B9").value(data.metrics.variation_coefficient).style("numberFormat", "0.00%");
            wsSummary.cell("B10").value(new Date().toLocaleDateString());

            // Write Active Filters
            wsSummary.cell("B11").value("Filtros Activos:");
            wsSummary.cell("A12").value("Segmento:");
            wsSummary.cell("B12").value(context.filters.tipoVehiculo.join(", ") || "Todos");

            wsSummary.cell("A13").value("Marca:");
            wsSummary.cell("B13").value(context.filters.brand.join(", ") || "Todas");

            wsSummary.cell("A14").value("Modelo:");
            wsSummary.cell("B14").value(context.filters.model.join(", ") || "Todos");

            wsSummary.cell("A15").value("Versión:");
            wsSummary.cell("B15").value(context.filters.submodel.join(", ") || "Todas");

            // Volatility Context
            let currentRow = 16;
            if (context.volatilityBrands && context.volatilityBrands.length > 0) {
                wsSummary.cell(`A${currentRow}`).value("Foco Volatilidad:");
                wsSummary.cell(`B${currentRow}`).value(context.volatilityBrands.join(", "));
                currentRow++;
            }

            if (context.volatilityPeriod) {
                wsSummary.cell(`A${currentRow}`).value("Periodo Volatilidad:");
                wsSummary.cell(`B${currentRow}`).value(context.volatilityPeriod);
            }

        } else {
            console.warn("Sheet 'Resumen Ejecutivo' not found");
        }

        // 2. Inventario (Nothing to convert)
        if (data.chart_data.models_by_category?.length) {
            const rows = data.chart_data.models_by_category.map(i => [i.category, i.count]);
            fillTable("Inventario", rows, 2, 1);
        }

        // 3. Precios por Segmento
        if (data.chart_data.prices_by_category?.length) {
            const rows = data.chart_data.prices_by_category.map(i => [
                i.category,
                convertPrice(i.avg_price),
                convertPrice(i.min_price),
                convertPrice(i.max_price)
            ]);
            fillTable("Precios por Segmento", rows, 2, 1);

            // Apply currency format to cols B, C, D (indices 2, 3, 4 of sheet) starting row 2
            const startRow = 2;
            const endRow = startRow + rows.length;
            const sheet = workbook.sheet("Precios por Segmento");
            if (sheet) {
                sheet.range(startRow, 2, endRow, 4).style("numberFormat", currencyFmt);
            }
        }

        // 4. Benchmarking
        if (data.chart_data.prices_by_brand?.length) {
            const rows = data.chart_data.prices_by_brand.map(i => [i.brand, convertPrice(i.avg_price)]);
            fillTable("Benchmarking", rows, 2, 1);

            // Apply currency to Col B
            const startRow = 2;
            const endRow = startRow + rows.length;
            const sheet = workbook.sheet("Benchmarking");
            if (sheet) {
                sheet.range(startRow, 2, endRow, 2).style("numberFormat", currencyFmt);
            }
        }

        // 5. Posicionamiento
        if (data.chart_data.models_by_principal?.length) {
            const rows = data.chart_data.models_by_principal.map(i => [
                i.model_principal,
                convertPrice(i.avg_price),
                i.count
            ]);
            fillTable("Posicionamiento", rows, 2, 1);

            // Apply currency to Col B
            const startRow = 2;
            const endRow = startRow + rows.length;
            const sheet = workbook.sheet("Posicionamiento");
            if (sheet) {
                sheet.range(startRow, 2, endRow, 2).style("numberFormat", currencyFmt);
            }
        }

        // 6. Volatilidad (Formato Plano/Vertical: Entidad | Fecha | Variación)
        if (data.chart_data.volatility_timeseries?.length) {
            const headerRow = ["Entidad", "Fecha", "Variación"];

            const flatRows = data.chart_data.volatility_timeseries.flatMap(series =>
                series.data.map(point => [
                    series.entity,
                    point.date,
                    point.variation
                ])
            );

            // Combine header and data
            const tableData = [headerRow, ...flatRows];

            fillTable("Volatilidad", tableData, 1, 1);
        }

        // 7. Modelos (New Sheet)
        if (modelsData && modelsData.length > 0) {
            let sheet = workbook.sheet("Modelos");
            if (!sheet) {
                sheet = workbook.addSheet("Modelos");
            }

            // Header
            const headers = ["Marca", "Modelo", "Versión", "Estado", "Tipo Vehículo", "Precio c/Bono", "Precio Lista", "Bono", "vs Lista %"];
            sheet.range(1, 1, 1, headers.length).value([headers]).style({ bold: true });

            // Data
            const rows = modelsData.map(m => {
                const vsList = (m.precio_con_bono && m.precio_lista)
                    ? ((m.precio_con_bono - m.precio_lista) / m.precio_lista)
                    : 0;

                return [
                    m.brand,
                    m.model,
                    m.submodel || '-',
                    m.estado || 'N/A',
                    m.tipo_vehiculo || 'N/A',
                    convertPrice(m.precio_con_bono || 0),
                    convertPrice(m.precio_lista || 0),
                    convertPrice(m.bono || 0),
                    vsList
                ];
            });

            // Write data starting at Row 2
            const startRow = 2;
            rows.forEach((row, r) => {
                row.forEach((val, c) => {
                    sheet.row(startRow + r).cell(1 + c).value(val);
                });
            });

            // Formatting
            const endRow = startRow + rows.length - 1;
            if (endRow >= startRow) {
                // Currency cols: F (6), G (7), H (8)
                sheet.range(startRow, 6, endRow, 8).style("numberFormat", currencyFmt);
                // Percent col: I (9)
                sheet.range(startRow, 9, endRow, 9).style("numberFormat", "0.0%");
            }
        }

        // Output
        const blob = await workbook.outputAsync();
        const dateStr = new Date().toISOString().split('T')[0];
        saveAs(blob, `Dashboard_Report_${dateStr}.xlsx`);

    } catch (e) {
        console.error("Export template error", e);
        alert(`Error exportando: ${(e as Error).message}`);
    }
};
