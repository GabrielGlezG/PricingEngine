/**
 * Generic Excel Export Functions for Different Pages
 * Uses Vercel Python serverless function at /api/generate-excel
 */

interface ExportSheet {
    name: string;
    chart_type: 'bar' | 'line';
    chart_title: string;
    data: Array<Record<string, string | number>>;
}

interface GenericExportPayload {
    filename: string;
    currencySymbol: string;
    timezoneOffset: number;
    title?: string;
    subtitle?: string;
    sheets: ExportSheet[];
    filters?: Record<string, string[]>;
}

/**
 * Export data to Excel with native charts via Vercel Python function
 */
export async function exportToExcel(payload: GenericExportPayload): Promise<boolean> {
    const dateStr = new Date().toISOString().split('T')[0];

    try {
        console.log('[Export] Sending to Vercel Python function...');

        const response = await fetch('/api/generate-excel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...payload,
                timezoneOffset: -(new Date().getTimezoneOffset() / 60)
            })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = payload.filename || `Export_${dateStr}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            console.log('[Export] ✓ Download completed!');
            return true;
        } else {
            const error = await response.text();
            console.error('[Export] Service error:', error);
            alert('Error al exportar. Intente nuevamente.');
            return false;
        }
    } catch (error) {
        console.error('[Export] Error:', error);
        alert('Error de conexión con el servicio de exportación.');
        return false;
    }
}

/**
 * Export data to PowerPoint via Vercel Python function
 */
export async function exportToPPT(payload: GenericExportPayload): Promise<boolean> {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = payload.filename.replace('.xlsx', '.pptx');

    try {
        console.log('[Export] Sending to Vercel Python function (PPT)...');

        const response = await fetch('/api/generate-ppt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...payload,
                filename: filename,
                timezoneOffset: -(new Date().getTimezoneOffset() / 60)
            })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            console.log('[Export] ✓ Download completed!');
            return true;
        } else {
            const error = await response.text();
            console.error('[Export] Service error:', error);
            alert('Error al exportar. Intente nuevamente.');
            return false;
        }
    } catch (error) {
        console.error('[Export] Error:', error);
        alert('Error de conexión con el servicio de exportación.');
        return false;
    }
}

/**
 * Export Compare page data
 */
export function exportCompareData(
    comparisonData: Array<{
        product: {
            brand: string;
            model: string;
            submodel?: string;
            tipo_vehiculo?: string;
            latest_price?: number;
            avg_price?: number;
            min_price?: number;
            max_price?: number;
        };
        priceData: Array<Record<string, string | number>>;
    }>,
    filters: { tipoVehiculo?: string[]; brand?: string[]; model?: string[]; submodel?: string[] },
    currencySymbol: string,
    convertPrice: (price: number) => number
) {
    if (comparisonData.length === 0) {
        alert('No hay datos para exportar. Seleccione modelos primero.');
        return;
    }

    const dateStr = new Date().toISOString().split('T')[0];

    // Create comparison summary sheet
    const summaryData = comparisonData.map(item => ({
        Marca: item.product.brand,
        Modelo: item.product.model,
        Versión: item.product.submodel || '-',
        Segmento: item.product.tipo_vehiculo || 'N/A',
        'Precio Actual': convertPrice(item.product.latest_price || 0),
        'Precio Promedio': convertPrice(item.product.avg_price || 0),
        'Precio Mínimo': convertPrice(item.product.min_price || 0),
        'Precio Máximo': convertPrice(item.product.max_price || 0)
    }));

    // Create price evolution data for chart
    const evolutionData: Array<Record<string, string | number>> = [];
    if (comparisonData[0]?.priceData) {
        comparisonData[0].priceData.forEach(point => {
            const row: Record<string, string | number> = { Fecha: point.date as string };
            comparisonData.forEach(item => {
                const label = `${item.product.brand} ${item.product.model} ${item.product.submodel || ''}`.trim();
                const priceKey = label;
                row[label] = convertPrice(Number(point[priceKey]) || 0);
            });
            evolutionData.push(row);
        });
    }

    const payload: GenericExportPayload = {
        filename: `Comparacion_Vehiculos_${dateStr}.xlsx`,
        currencySymbol,
        timezoneOffset: -(new Date().getTimezoneOffset() / 60),
        title: 'COMPARACIÓN DE VEHÍCULOS',
        filters: {
            Segmento: filters.tipoVehiculo || [],
            Marca: filters.brand || [],
            Modelo: filters.model || []
        },
        sheets: [
            {
                name: 'Resumen Comparación',
                chart_type: 'bar',
                chart_title: 'Comparación de Precios',
                data: summaryData
            },
            evolutionData.length > 0 ? {
                name: 'Evolución de Precios',
                chart_type: 'line',
                chart_title: 'Evolución Histórica de Precios',
                data: evolutionData
            } : null
        ].filter(Boolean) as ExportSheet[]
    };

    return exportToExcel(payload);
    return exportToExcel(payload);
}

export function exportCompareDataPPT(
    comparisonData: Array<{
        product: {
            brand: string;
            model: string;
            submodel?: string;
            tipo_vehiculo?: string;
            latest_price?: number;
            avg_price?: number;
            min_price?: number;
            max_price?: number;
        };
        priceData: Array<Record<string, string | number>>;
    }>,
    filters: { tipoVehiculo?: string[]; brand?: string[]; model?: string[]; submodel?: string[] },
    currencySymbol: string,
    convertPrice: (price: number) => number
) {
    if (comparisonData.length === 0) {
        alert('No hay datos para exportar. Seleccione modelos primero.');
        return;
    }

    const dateStr = new Date().toISOString().split('T')[0];

    // Create comparison summary sheet
    const summaryData = comparisonData.map(item => ({
        Marca: item.product.brand,
        Modelo: item.product.model,
        Versión: item.product.submodel || '-',
        Segmento: item.product.tipo_vehiculo || 'N/A',
        'Precio Actual': convertPrice(item.product.latest_price || 0),
        'Precio Promedio': convertPrice(item.product.avg_price || 0),
        'Precio Mínimo': convertPrice(item.product.min_price || 0),
        'Precio Máximo': convertPrice(item.product.max_price || 0)
    }));

    // Create price evolution data for chart
    const evolutionData: Array<Record<string, string | number>> = [];
    if (comparisonData[0]?.priceData) {
        comparisonData[0].priceData.forEach(point => {
            const row: Record<string, string | number> = { Fecha: point.date as string };
            comparisonData.forEach(item => {
                const label = `${item.product.brand} ${item.product.model} ${item.product.submodel || ''}`.trim();
                const priceKey = label;
                row[label] = convertPrice(Number(point[priceKey]) || 0);
            });
            evolutionData.push(row);
        });
    }

    const payload: GenericExportPayload = {
        filename: `Comparacion_Vehiculos_${dateStr}.pptx`,
        currencySymbol,
        timezoneOffset: -(new Date().getTimezoneOffset() / 60),
        title: 'COMPARACIÓN DE VEHÍCULOS',
        filters: {
            Segmento: filters.tipoVehiculo || [],
            Marca: filters.brand || [],
            Modelo: filters.model || []
        },
        sheets: [
            evolutionData.length > 0 ? {
                name: 'Evolución de Precios',
                chart_type: 'line',
                chart_title: 'Evolución Histórica de Precios',
                data: evolutionData
            } : null
        ].filter(Boolean) as ExportSheet[]
    };

    return exportToPPT(payload);
}

/**
 * Export Price Evolution page data
 */
export function exportPriceEvolutionData(
    chartData: {
        labels: string[];
        datasets: Array<{
            label: string;
            data: number[];
        }>;
    },
    filters: { tipoVehiculo?: string[]; brand?: string[]; model?: string[]; submodel?: string[] },
    currencySymbol: string,
    convertPrice: (price: number) => number
) {
    if (!chartData || chartData.labels.length === 0) {
        alert('No hay datos para exportar. Aplique filtros primero.');
        return;
    }

    const dateStr = new Date().toISOString().split('T')[0];

    // Transform chart data to table format
    const evolutionData: Array<Record<string, string | number>> = chartData.labels.map((label, i) => {
        const row: Record<string, string | number> = { Fecha: label };
        chartData.datasets.forEach(dataset => {
            row[dataset.label] = convertPrice(dataset.data[i] || 0);
        });
        return row;
    });

    const payload: GenericExportPayload = {
        filename: `Evolucion_Precios_${dateStr}.xlsx`,
        currencySymbol,
        timezoneOffset: -(new Date().getTimezoneOffset() / 60),
        title: 'EVOLUCIÓN DE PRECIOS',
        filters: {
            Segmento: filters.tipoVehiculo || [],
            Marca: filters.brand || [],
            Modelo: filters.model || [],
            Versión: filters.submodel || []
        },
        sheets: [
            {
                name: 'Evolución de Precios',
                chart_type: 'line',
                chart_title: 'Tendencia de Precios',
                data: evolutionData
            }
        ]
    };

    return exportToExcel(payload);
    return exportToExcel(payload);
}

export function exportPriceEvolutionDataPPT(
    chartData: {
        labels: string[];
        datasets: Array<{
            label: string;
            data: number[];
        }>;
    },
    filters: { tipoVehiculo?: string[]; brand?: string[]; model?: string[]; submodel?: string[] },
    currencySymbol: string,
    convertPrice: (price: number) => number
) {
    if (!chartData || chartData.labels.length === 0) {
        alert('No hay datos para exportar. Aplique filtros primero.');
        return;
    }

    const dateStr = new Date().toISOString().split('T')[0];

    // Transform chart data to table format
    const evolutionData: Array<Record<string, string | number>> = chartData.labels.map((label, i) => {
        const row: Record<string, string | number> = { Fecha: label };
        chartData.datasets.forEach(dataset => {
            row[dataset.label] = convertPrice(dataset.data[i] || 0);
        });
        return row;
    });

    const payload: GenericExportPayload = {
        filename: `Evolucion_Precios_${dateStr}.pptx`,
        currencySymbol,
        timezoneOffset: -(new Date().getTimezoneOffset() / 60),
        title: 'EVOLUCIÓN DE PRECIOS',
        filters: {
            Segmento: filters.tipoVehiculo || [],
            Marca: filters.brand || [],
            Modelo: filters.model || [],
            Versión: filters.submodel || []
        },
        sheets: [
            {
                name: 'Evolución de Precios',
                chart_type: 'line',
                chart_title: 'Tendencia de Precios',
                data: evolutionData
            }
        ]
    };

    return exportToPPT(payload);
}
