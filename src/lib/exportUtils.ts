/**
 * Excel Export Utility for Dashboard
 * Uses Vercel Python serverless function at /api/generate-excel
 * Falls back to local generation if service unavailable
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

// Color palette for Excel styling (fallback)
const COLORS = {
    primary: "4F46E5",
    header: "1E293B",
    headerText: "FFFFFF",
    altRow: "F1F5F9",
    border: "E2E8F0"
};

/**
 * Export Dashboard data to Excel with native charts (via Python service)
 */
export const exportDashboardToExcel = async (
    data: AnalyticsData,
    context: ExportContext,
    currencySymbol: string = "$",
    convertPrice: (price: number) => number = (p) => p,
    modelsData?: ModelData[]
) => {
    if (!data) return;

    const dateStr = new Date().toISOString().split('T')[0];

    // Try Vercel Python function first (native charts)
    try {
        console.log("[Excel Export] Using Vercel Python function for native charts...");

        const payload = {
            filename: `Dashboard_Report_${dateStr}.xlsx`,
            currencySymbol,
            timezoneOffset: -(new Date().getTimezoneOffset() / 60), // Convert minutes to hours, negate for correct UTC offset
            summary: {
                total_models: data.metrics.total_models,
                total_brands: data.metrics.total_brands,
                avg_price: convertPrice(data.metrics.avg_price),
                median_price: convertPrice(data.metrics.median_price),
                min_price: convertPrice(data.metrics.min_price),
                max_price: convertPrice(data.metrics.max_price),
                price_std_dev: convertPrice(data.metrics.price_std_dev),
                variation_coefficient: data.metrics.variation_coefficient / 100, // Convert to decimal
                filters: context.filters
            },
            sheets: [
                // Precios por Segmento
                data.chart_data.prices_by_category?.length ? {
                    name: "Precios por Segmento",
                    chart_type: "bar",
                    chart_title: "Precios por Segmento",
                    data: data.chart_data.prices_by_category.map(d => ({
                        Segmento: d.category,
                        Promedio: convertPrice(d.avg_price),
                        Mínimo: convertPrice(d.min_price),
                        Máximo: convertPrice(d.max_price)
                    }))
                } : null,
                // Benchmarking
                data.chart_data.prices_by_brand?.length ? {
                    name: "Benchmarking",
                    chart_type: "line",
                    chart_title: "Benchmarking de Precios por Marca",
                    data: [...data.chart_data.prices_by_brand]
                        .sort((a, b) => b.avg_price - a.avg_price)
                        .map(d => ({
                            Marca: d.brand,
                            "Precio Promedio": convertPrice(d.avg_price)
                        }))
                } : null,
                // Volatilidad
                data.chart_data.brand_variations?.length ? {
                    name: "Volatilidad",
                    chart_type: "bar",
                    chart_title: "Índice de Volatilidad Histórica",
                    data: [...data.chart_data.brand_variations]
                        .sort((a, b) => b.variation_percent - a.variation_percent)
                        .map(d => ({
                            Marca: d.brand,
                            "Variación %": d.variation_percent / 100
                        }))
                } : null
            ].filter(Boolean),
            models: modelsData?.map(m => ({
                brand: m.brand,
                model: m.model,
                submodel: m.submodel,
                estado: m.estado,
                tipo_vehiculo: m.tipo_vehiculo,
                precio_con_bono: convertPrice(m.precio_con_bono || 0),
                precio_lista: convertPrice(m.precio_lista || 0),
                bono: convertPrice(m.bono || 0)
            }))
        };

        const response = await fetch('/api/generate-excel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const blob = await response.blob();
            saveAs(blob, `Dashboard_Report_${dateStr}.xlsx`);
            console.log("[Excel Export] ✓ Native charts export completed!");
            return;
        } else {
            console.warn("[Excel Export] Service returned error, falling back to local...");
            // Fallback: Local generation without charts
            console.log("[Excel Export] Using local generation (no native charts)...");
            await exportLocalExcel(data, context, currencySymbol, convertPrice, modelsData);
        }
    } catch (error) {
        console.warn("[Excel Export] Service unavailable, falling back to local...", error);
        // Fallback: Local generation without charts
        console.log("[Excel Export] Using local generation (no native charts)...");
        await exportLocalExcel(data, context, currencySymbol, convertPrice, modelsData);
    }
};

/**
 * Local Excel generation fallback (styled tables, no charts)
 */
async function exportLocalExcel(
    data: AnalyticsData,
    context: ExportContext,
    currencySymbol: string,
    convertPrice: (price: number) => number,
    modelsData?: ModelData[]
) {
    try {
        const workbook = await XlsxPopulate.fromBlankAsync();
        const dateStr = new Date().toISOString().split('T')[0];
        const currencyFmt = currencySymbol === "UF" ? `"${currencySymbol}" #,##0.00` : `"${currencySymbol}" #,##0`;

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

        // Summary Sheet
        const wsSummary = workbook.sheet(0).name("Resumen Ejecutivo");
        wsSummary.cell("A1").value("REPORTE DE DASHBOARD").style({ bold: true, fontSize: 16 });
        wsSummary.cell("A2").value(`Generado: ${new Date().toLocaleDateString()}`).style({ italic: true, fontColor: "666666" });

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
            if (i >= 2 && i <= 6) wsSummary.cell(row, 2).style("numberFormat", currencyFmt);
            else if (i === 7) wsSummary.cell(row, 2).style("numberFormat", "0.00%");
        });

        // Precios por Segmento
        if (data.chart_data.prices_by_category?.length) {
            const ws = workbook.addSheet("Precios por Segmento");
            ws.cell(1, 1).value("Segmento");
            ws.cell(1, 2).value("Precio Mínimo");
            ws.cell(1, 3).value("Precio Promedio");
            ws.cell(1, 4).value("Precio Máximo");
            styleHeader(ws, 1, 4);

            data.chart_data.prices_by_category.forEach((item, i) => {
                const row = i + 2;
                ws.cell(row, 1).value(item.category);
                ws.cell(row, 2).value(convertPrice(item.min_price)).style("numberFormat", currencyFmt);
                ws.cell(row, 3).value(convertPrice(item.avg_price)).style("numberFormat", currencyFmt);
                ws.cell(row, 4).value(convertPrice(item.max_price)).style("numberFormat", currencyFmt);
            });
            styleDataRows(ws, 2, data.chart_data.prices_by_category.length + 1, 4);
        }

        // Benchmarking
        if (data.chart_data.prices_by_brand?.length) {
            const ws = workbook.addSheet("Benchmarking");
            ws.cell(1, 1).value("Marca");
            ws.cell(1, 2).value("Precio Promedio");
            ws.cell(1, 3).value("Precio Mínimo");
            ws.cell(1, 4).value("Precio Máximo");
            ws.cell(1, 5).value("Cantidad");
            styleHeader(ws, 1, 5);

            const sorted = [...data.chart_data.prices_by_brand].sort((a, b) => b.avg_price - a.avg_price);
            sorted.forEach((item, i) => {
                const row = i + 2;
                ws.cell(row, 1).value(item.brand);
                ws.cell(row, 2).value(convertPrice(item.avg_price)).style("numberFormat", currencyFmt);
                ws.cell(row, 3).value(convertPrice(item.min_price)).style("numberFormat", currencyFmt);
                ws.cell(row, 4).value(convertPrice(item.max_price)).style("numberFormat", currencyFmt);
                ws.cell(row, 5).value(item.count);
            });
            styleDataRows(ws, 2, sorted.length + 1, 5);
        }

        // Volatilidad
        if (data.chart_data.brand_variations?.length) {
            const ws = workbook.addSheet("Volatilidad");
            ws.cell(1, 1).value("Marca");
            ws.cell(1, 2).value("Variación %");
            styleHeader(ws, 1, 2);

            const sorted = [...data.chart_data.brand_variations].sort((a, b) => b.variation_percent - a.variation_percent);
            sorted.forEach((item, i) => {
                const row = i + 2;
                ws.cell(row, 1).value(item.brand);
                ws.cell(row, 2).value(item.variation_percent / 100).style("numberFormat", "0.00%");
            });
            styleDataRows(ws, 2, sorted.length + 1, 2);
        }

        // Modelos
        if (modelsData && modelsData.length > 0) {
            const ws = workbook.addSheet("Modelos");
            const headers = ["Marca", "Modelo", "Versión", "Estado", "Tipo Vehículo", "Precio c/Bono", "Precio Lista", "Bono", "% Descuento"];
            headers.forEach((h, i) => ws.cell(1, i + 1).value(h));
            styleHeader(ws, 1, headers.length);

            modelsData.forEach((m, rowIdx) => {
                const row = rowIdx + 2;
                // Calculate Discount %
                const discountPct = (m.bono && m.precio_lista && m.precio_lista > 0)
                    ? (m.bono / m.precio_lista) : 0;

                ws.cell(row, 1).value(m.brand);
                ws.cell(row, 2).value(m.model);
                ws.cell(row, 3).value(m.submodel || '-');
                ws.cell(row, 4).value(m.estado || 'N/A');
                ws.cell(row, 5).value(m.tipo_vehiculo || 'N/A');
                ws.cell(row, 6).value(convertPrice(m.precio_con_bono || 0)).style("numberFormat", currencyFmt);
                ws.cell(row, 7).value(convertPrice(m.precio_lista || 0)).style("numberFormat", currencyFmt);
                ws.cell(row, 8).value(convertPrice(m.bono || 0)).style("numberFormat", currencyFmt);
                ws.cell(row, 9).value(discountPct).style("numberFormat", "0.0%");
            });
            styleDataRows(ws, 2, modelsData.length + 1, headers.length);
        }

        const blob = await workbook.outputAsync();
        saveAs(blob, `Dashboard_Report_${dateStr}.xlsx`);
        console.log("[Excel Export] ✓ Local export completed (no charts)");

    } catch (e) {
        console.error("[Excel Export] Error:", e);
        alert(`Error exportando: ${(e as Error).message}`);
    }
}
