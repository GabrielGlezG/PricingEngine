import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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
    };
    generated_at: string;
}

export const exportDashboardToExcel = async (
    data: AnalyticsData,
    chartImages: Record<string, string>,
    currencySymbol: string = "$",
    convertPrice: (price: number) => number = (p) => p
) => {
    if (!data) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "PricingEngine";
    workbook.created = new Date();

    // Helper to add image to sheet
    const addChartImage = (sheet: ExcelJS.Worksheet, imageId: string, row: number, col: number) => {
        if (chartImages[imageId]) {
            const imageIdInWorkbook = workbook.addImage({
                base64: chartImages[imageId],
                extension: 'png',
            });
            sheet.addImage(imageIdInWorkbook, {
                tl: { col: col, row: row },
                ext: { width: 600, height: 350 }
            });
        }
    };

    // 1. Sheet: Resumen
    const wsSummary = workbook.addWorksheet("Resumen Ejecutivo");
    wsSummary.columns = [
        { header: "Métrica", key: "metric", width: 30 },
        { header: `Valor (${currencySymbol})`, key: "value", width: 20 }
    ];

    wsSummary.addRows([
        { metric: "Total Modelos", value: data.metrics.total_models },
        { metric: "Total Marcas", value: data.metrics.total_brands },
        { metric: "Precio Promedio", value: convertPrice(data.metrics.avg_price) },
        { metric: "Precio Mediana", value: convertPrice(data.metrics.median_price) },
        { metric: "Precio Mínimo", value: convertPrice(data.metrics.min_price) },
        { metric: "Precio Máximo", value: convertPrice(data.metrics.max_price) },
        { metric: "Desviación Estándar", value: convertPrice(data.metrics.price_std_dev) },
        { metric: "Coeficiente Variación (%)", value: data.metrics.variation_coefficient },
        { metric: "Fecha Generación", value: data.generated_at }
    ]);

    // 2. Sheet: Inventario (Modelos por Categoría)
    const wsInv = workbook.addWorksheet("Inventario");
    wsInv.columns = [
        { header: "Categoría", key: "cat", width: 25 },
        { header: "Cantidad Modelos", key: "count", width: 15 }
    ];
    if (data.chart_data.models_by_category?.length) {
        data.chart_data.models_by_category.forEach(item => {
            wsInv.addRow({ cat: item.category, count: item.count });
        });
        // Add Chart Image
        addChartImage(wsInv, 'inventory', 2, 4);
    }

    // 3. Sheet: Precios por Categoría
    const wsPricesCat = workbook.addWorksheet("Precios por Categoría");
    wsPricesCat.columns = [
        { header: "Categoría", key: "cat", width: 25 },
        { header: "Promedio", key: "avg", width: 15 },
        { header: "Mínimo", key: "min", width: 15 },
        { header: "Máximo", key: "max", width: 15 }
    ];
    if (data.chart_data.prices_by_category?.length) {
        data.chart_data.prices_by_category.forEach(item => {
            wsPricesCat.addRow({
                cat: item.category,
                avg: convertPrice(item.avg_price),
                min: convertPrice(item.min_price),
                max: convertPrice(item.max_price)
            });
        });
        // Add Chart Image (Boxplot)
        addChartImage(wsPricesCat, 'price_breakdown', 2, 6);
    }

    // 4. Sheet: Benchmarking Marcas
    const wsBrands = workbook.addWorksheet("Benchmarking");
    wsBrands.columns = [
        { header: "Marca", key: "brand", width: 20 },
        { header: "Precio Promedio", key: "avg", width: 15 }
    ];
    if (data.chart_data.prices_by_brand?.length) {
        data.chart_data.prices_by_brand.forEach(item => {
            wsBrands.addRow({ brand: item.brand, avg: convertPrice(item.avg_price) });
        });
        addChartImage(wsBrands, 'benchmarking', 2, 4);
    }

    // 5. Sheet: Posicionamiento
    const wsPos = workbook.addWorksheet("Posicionamiento");
    wsPos.columns = [
        { header: "Modelo", key: "model", width: 25 },
        { header: "Precio", key: "price", width: 15 },
        { header: "Volumen", key: "vol", width: 10 }
    ];
    if (data.chart_data.models_by_principal?.length) {
        data.chart_data.models_by_principal.forEach(item => {
            wsPos.addRow({
                model: item.model_principal,
                price: convertPrice(item.avg_price),
                vol: item.count
            });
        });
        addChartImage(wsPos, 'positioning', 2, 5);
    }

    // 6. Sheet: Volatilidad
    const wsVol = workbook.addWorksheet("Volatilidad");
    wsVol.columns = [
        { header: "Entidad", key: "ent", width: 20 },
        { header: "Fecha", key: "date", width: 15 },
        { header: "Variación", key: "var", width: 15 }
    ];
    if (data.chart_data.volatility_timeseries?.length) {
        const flatVol = data.chart_data.volatility_timeseries.flatMap(series =>
            series.data.map(point => ({
                ent: series.entity,
                date: point.date,
                var: point.variation
            }))
        );
        flatVol.forEach(r => wsVol.addRow(r));
        addChartImage(wsVol, 'volatility', 2, 5);
    }

    // Generate buffer and save
    const buffer = await workbook.xlsx.writeBuffer();
    const dataBlob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
    const dateStr = new Date().toISOString().split('T')[0];
    saveAs(dataBlob, `PricingEngine_Report_With_Charts_${dateStr}.xlsx`);
};
