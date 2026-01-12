/**
 * Excel Export Utility
 * Uses xlsx-populate for browser-compatible Excel generation
 * Creates well-structured data tables that can be easily charted in Excel
 */

// @ts-ignore
import XlsxPopulate from 'xlsx-populate/browser/xlsx-populate';
import { saveAs } from "file-saver";
import { ModelData } from "./fetchModelsData";

interface Metric {
    total_models: number;
    total_brands: number;
    total_model_families?: number;
    total_categories?: number;
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
        prices_by_segment_breakdown?: Record<string, Array<{ brand: string; avg_price: number; count?: number }>>;
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

// Color palette for Excel styling
const COLORS = {
    primary: "4F46E5",      // Indigo
    header: "1E293B",       // Slate-800
    headerText: "FFFFFF",   // White
    altRow: "F1F5F9",       // Slate-100
    border: "E2E8F0"        // Slate-200
};

/**
 * Export Dashboard data to Excel with formatted tables
 */
export const exportDashboardToExcel = async (
    data: AnalyticsData,
    context: ExportContext,
    currencySymbol: string = "$",
    convertPrice: (price: number) => number = (p) => p,
    modelsData?: ModelData[]
) => {
    if (!data) return;

    try {
        console.log("[Excel Export] Starting export...");

        const workbook = await XlsxPopulate.fromBlankAsync();
        const dateStr = new Date().toISOString().split('T')[0];
        const currencyFmt = currencySymbol === "UF" ? `"${currencySymbol}" #,##0.00` : `"${currencySymbol}" #,##0`;

        // Helper to style headers
        const styleHeader = (sheet: any, row: number, cols: number) => {
            for (let c = 1; c <= cols; c++) {
                sheet.cell(row, c).style({
                    bold: true,
                    fill: COLORS.header,
                    fontColor: COLORS.headerText,
                    horizontalAlignment: "center",
                    border: true
                });
            }
        };

        // Helper to style data rows with alternating colors
        const styleDataRows = (sheet: any, startRow: number, endRow: number, cols: number) => {
            for (let r = startRow; r <= endRow; r++) {
                for (let c = 1; c <= cols; c++) {
                    const isAlt = (r - startRow) % 2 === 1;
                    sheet.cell(r, c).style({
                        fill: isAlt ? COLORS.altRow : "FFFFFF",
                        border: { color: COLORS.border }
                    });
                }
            }
        };

        // =====================================================
        // SHEET 1: Resumen Ejecutivo
        // =====================================================
        const wsSummary = workbook.sheet(0).name("Resumen Ejecutivo");

        // Title
        wsSummary.cell("A1").value("REPORTE DE DASHBOARD").style({ bold: true, fontSize: 16 });
        wsSummary.cell("A2").value(`Generado: ${new Date().toLocaleDateString()}`).style({ italic: true, fontColor: "666666" });

        // Metrics Table
        wsSummary.cell("A4").value("Métrica").style({ bold: true, fill: COLORS.header, fontColor: COLORS.headerText });
        wsSummary.cell("B4").value("Valor").style({ bold: true, fill: COLORS.header, fontColor: COLORS.headerText });

        const metrics = [
            ["Total Modelos", data.metrics.total_models],
            ["Total Marcas", data.metrics.total_brands],
            ["Precio Promedio", convertPrice(data.metrics.avg_price)],
            ["Precio Mediano", convertPrice(data.metrics.median_price)],
            ["Precio Mínimo", convertPrice(data.metrics.min_price)],
            ["Precio Máximo", convertPrice(data.metrics.max_price)],
            ["Desviación Estándar", convertPrice(data.metrics.price_std_dev)],
            ["Coef. Variación", data.metrics.variation_coefficient]
        ];

        metrics.forEach((m, i) => {
            const row = 5 + i;
            wsSummary.cell(row, 1).value(m[0]);
            wsSummary.cell(row, 2).value(m[1]);
            if (i >= 2 && i <= 6) {
                wsSummary.cell(row, 2).style("numberFormat", currencyFmt);
            } else if (i === 7) {
                wsSummary.cell(row, 2).style("numberFormat", "0.00%");
            }
        });

        // Filters Section
        wsSummary.cell("A14").value("Filtros Aplicados").style({ bold: true });
        wsSummary.cell("A15").value("Segmento:");
        wsSummary.cell("B15").value(context.filters.tipoVehiculo.join(", ") || "Todos");
        wsSummary.cell("A16").value("Marca:");
        wsSummary.cell("B16").value(context.filters.brand.join(", ") || "Todas");
        wsSummary.cell("A17").value("Modelo:");
        wsSummary.cell("B17").value(context.filters.model.join(", ") || "Todos");
        wsSummary.cell("A18").value("Versión:");
        wsSummary.cell("B18").value(context.filters.submodel.join(", ") || "Todas");

        // =====================================================
        // SHEET 2: Precios por Segmento
        // =====================================================
        if (data.chart_data.prices_by_category?.length) {
            const wsSegment = workbook.addSheet("Precios por Segmento");

            // Headers
            wsSegment.cell(1, 1).value("Segmento");
            wsSegment.cell(1, 2).value("Precio Mínimo");
            wsSegment.cell(1, 3).value("Precio Promedio");
            wsSegment.cell(1, 4).value("Precio Máximo");
            styleHeader(wsSegment, 1, 4);

            // Data
            data.chart_data.prices_by_category.forEach((item, i) => {
                const row = i + 2;
                wsSegment.cell(row, 1).value(item.category);
                wsSegment.cell(row, 2).value(convertPrice(item.min_price)).style("numberFormat", currencyFmt);
                wsSegment.cell(row, 3).value(convertPrice(item.avg_price)).style("numberFormat", currencyFmt);
                wsSegment.cell(row, 4).value(convertPrice(item.max_price)).style("numberFormat", currencyFmt);
            });

            const endRow = data.chart_data.prices_by_category.length + 1;
            styleDataRows(wsSegment, 2, endRow, 4);

            // Set column widths
            wsSegment.column(1).width(20);
            wsSegment.column(2).width(18);
            wsSegment.column(3).width(18);
            wsSegment.column(4).width(18);

            // Add note about charting
            wsSegment.cell(endRow + 2, 1).value("💡 Tip: Selecciona los datos y usa Insertar > Gráfico para crear una visualización")
                .style({ italic: true, fontColor: "666666" });
        }

        // =====================================================
        // SHEET 3: Benchmarking por Marca
        // =====================================================
        if (data.chart_data.prices_by_brand?.length) {
            const wsBenchmark = workbook.addSheet("Benchmarking");

            // Headers
            wsBenchmark.cell(1, 1).value("Marca");
            wsBenchmark.cell(1, 2).value("Precio Promedio");
            wsBenchmark.cell(1, 3).value("Precio Mínimo");
            wsBenchmark.cell(1, 4).value("Precio Máximo");
            wsBenchmark.cell(1, 5).value("Cantidad");
            styleHeader(wsBenchmark, 1, 5);

            // Data (sorted by avg_price desc)
            const sortedBrands = [...data.chart_data.prices_by_brand].sort((a, b) => b.avg_price - a.avg_price);

            sortedBrands.forEach((item, i) => {
                const row = i + 2;
                wsBenchmark.cell(row, 1).value(item.brand);
                wsBenchmark.cell(row, 2).value(convertPrice(item.avg_price)).style("numberFormat", currencyFmt);
                wsBenchmark.cell(row, 3).value(convertPrice(item.min_price)).style("numberFormat", currencyFmt);
                wsBenchmark.cell(row, 4).value(convertPrice(item.max_price)).style("numberFormat", currencyFmt);
                wsBenchmark.cell(row, 5).value(item.count);
            });

            const endRow = sortedBrands.length + 1;
            styleDataRows(wsBenchmark, 2, endRow, 5);

            // Set column widths
            wsBenchmark.column(1).width(20);
            wsBenchmark.column(2).width(18);
            wsBenchmark.column(3).width(18);
            wsBenchmark.column(4).width(18);
            wsBenchmark.column(5).width(12);
        }

        // =====================================================
        // SHEET 4: Volatilidad Histórica
        // =====================================================
        if (data.chart_data.brand_variations?.length) {
            const wsVolatility = workbook.addSheet("Volatilidad");

            // Headers
            wsVolatility.cell(1, 1).value("Marca");
            wsVolatility.cell(1, 2).value("Variación %");
            styleHeader(wsVolatility, 1, 2);

            // Data (sorted by variation desc)
            const sortedVariations = [...data.chart_data.brand_variations].sort((a, b) => b.variation_percent - a.variation_percent);

            sortedVariations.forEach((item, i) => {
                const row = i + 2;
                wsVolatility.cell(row, 1).value(item.brand);
                wsVolatility.cell(row, 2).value(item.variation_percent / 100).style("numberFormat", "0.00%");
            });

            const endRow = sortedVariations.length + 1;
            styleDataRows(wsVolatility, 2, endRow, 2);

            wsVolatility.column(1).width(20);
            wsVolatility.column(2).width(15);
        }

        // =====================================================
        // SHEET 5: Volatilidad en el Tiempo (Flat format)
        // =====================================================
        if (data.chart_data.volatility_timeseries?.length) {
            const wsTimeseries = workbook.addSheet("Volatilidad Tiempo");

            // Headers
            wsTimeseries.cell(1, 1).value("Entidad");
            wsTimeseries.cell(1, 2).value("Fecha");
            wsTimeseries.cell(1, 3).value("Variación %");
            wsTimeseries.cell(1, 4).value("Precio Promedio");
            styleHeader(wsTimeseries, 1, 4);

            // Flatten data
            let rowNum = 2;
            data.chart_data.volatility_timeseries.forEach(series => {
                series.data.forEach(point => {
                    wsTimeseries.cell(rowNum, 1).value(series.entity);
                    wsTimeseries.cell(rowNum, 2).value(point.date);
                    wsTimeseries.cell(rowNum, 3).value(point.variation / 100).style("numberFormat", "0.00%");
                    wsTimeseries.cell(rowNum, 4).value(convertPrice(point.avg_price)).style("numberFormat", currencyFmt);
                    rowNum++;
                });
            });

            styleDataRows(wsTimeseries, 2, rowNum - 1, 4);

            wsTimeseries.column(1).width(20);
            wsTimeseries.column(2).width(12);
            wsTimeseries.column(3).width(15);
            wsTimeseries.column(4).width(18);
        }

        // =====================================================
        // SHEET 6: Modelos (Tabla completa)
        // =====================================================
        if (modelsData && modelsData.length > 0) {
            const wsModels = workbook.addSheet("Modelos");

            // Headers
            const headers = ["Marca", "Modelo", "Versión", "Estado", "Tipo Vehículo", "Precio c/Bono", "Precio Lista", "Bono", "Dif. vs Lista"];
            headers.forEach((h, i) => {
                wsModels.cell(1, i + 1).value(h);
            });
            styleHeader(wsModels, 1, headers.length);

            // Data
            modelsData.forEach((m, rowIdx) => {
                const row = rowIdx + 2;
                const vsList = (m.precio_con_bono && m.precio_lista && m.precio_lista !== 0)
                    ? ((m.precio_con_bono - m.precio_lista) / m.precio_lista)
                    : 0;

                wsModels.cell(row, 1).value(m.brand);
                wsModels.cell(row, 2).value(m.model);
                wsModels.cell(row, 3).value(m.submodel || '-');
                wsModels.cell(row, 4).value(m.estado || 'N/A');
                wsModels.cell(row, 5).value(m.tipo_vehiculo || 'N/A');
                wsModels.cell(row, 6).value(convertPrice(m.precio_con_bono || 0)).style("numberFormat", currencyFmt);
                wsModels.cell(row, 7).value(convertPrice(m.precio_lista || 0)).style("numberFormat", currencyFmt);
                wsModels.cell(row, 8).value(convertPrice(m.bono || 0)).style("numberFormat", currencyFmt);
                wsModels.cell(row, 9).value(vsList).style("numberFormat", "0.0%");
            });

            const endRow = modelsData.length + 1;
            styleDataRows(wsModels, 2, endRow, headers.length);

            // Set column widths
            wsModels.column(1).width(15);
            wsModels.column(2).width(20);
            wsModels.column(3).width(25);
            wsModels.column(4).width(12);
            wsModels.column(5).width(15);
            wsModels.column(6).width(18);
            wsModels.column(7).width(18);
            wsModels.column(8).width(15);
            wsModels.column(9).width(15);
        }

        // =====================================================
        // Output
        // =====================================================
        const blob = await workbook.outputAsync();
        saveAs(blob, `Dashboard_Report_${dateStr}.xlsx`);

        console.log("[Excel Export] ✓ Export completed!");

    } catch (e) {
        console.error("[Excel Export] Error:", e);
        alert(`Error exportando: ${(e as Error).message}`);
    }
};
