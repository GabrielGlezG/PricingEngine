import { hslVar } from "@/lib/utils";

/**
 * Configuración centralizada de colores para todos los gráficos
 * Modifica este archivo para cambiar los colores de todos los gráficos de la aplicación
 */

/**
 * Obtiene la paleta de colores principal para gráficos
 * @param count - Número de colores a generar (por defecto 12)
 * @param alpha - Opacidad opcional (0-1)
 */
export function getChartPalette(count: number = 12, alpha?: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const colorVar = `--chart-${(i % 8) + 1}`;
    colors.push(hslVar(colorVar, alpha));
  }
  return colors;
}

/**
 * Configuración de colores para gráficos de barras
 */
export const barChartColors = {
  // Color principal para barras simples
  primary: () => hslVar("--primary"),

  // Paleta para barras múltiples (cada barra un color diferente)
  multiBar: (count: number = 12) => getChartPalette(count),

  // Opacidad para hover
  hoverAlpha: 0.8,
};

/**
 * Configuración de colores para gráficos de líneas
 */
export const lineChartColors = {
  // Colores para líneas individuales
  lines: [
    () => hslVar("--chart-1"),
    () => hslVar("--chart-2"),
    () => hslVar("--chart-3"),
    () => hslVar("--chart-4"),
    () => hslVar("--chart-5"),
    () => hslVar("--chart-6"),
    () => hslVar("--chart-7"),
    () => hslVar("--chart-8"),
  ],

  // Obtiene un color de línea por índice
  getLineColor: (index: number) => {
    const colorVar = `--chart-${(index % 8) + 1}`;
    return hslVar(colorVar);
  },

  // Grosor de línea
  borderWidth: 2,

  // Radio de puntos
  pointRadius: 4,
  pointHoverRadius: 6,

  // Tensión de la curva (0 = recta, 1 = muy curva)
  tension: 0.4,
};

/**
 * Configuración de colores para gráficos de pastel (pie)
 */
export const pieChartColors = {
  // Paleta de colores para secciones
  palette: (count: number = 12) => getChartPalette(count),

  // Grosor del borde
  borderWidth: 2,

  // Color del borde (usa el color de la tarjeta)
  borderColor: () => hslVar("--card"),
};

/**
 * Configuración de colores para gráficos de burbujas
 */
export const bubbleChartColors = {
  // Color principal para burbujas
  primary: () => hslVar("--primary"),

  // Colores múltiples para diferentes series
  multiple: (count: number = 12) => getChartPalette(count),
};

/**
 * Configuración de colores para tooltips
 */
export const tooltipColors = {
  backgroundColor: () => hslVar("--card"),
  borderColor: () => hslVar("--border"),
  titleColor: () => hslVar("--foreground"),
  bodyColor: () => hslVar("--foreground"),
  borderWidth: 1,
  padding: 12,
  cornerRadius: 8,
};

/**
 * Configuración de colores para ejes y grids
 */
export const axisColors = {
  gridColor: () => hslVar("--border"),
  gridLineWidth: 0.5,
  tickColor: () => hslVar("--foreground"),
  tickFontSize: 11,
};

/**
 * Dataset completo para gráfico de barras con colores por columna
 */
export function createMultiColorBarDataset(
  data: any[],
  label: string = "Cantidad"
): any {
  const colors = getChartPalette(data.length);

  return {
    label,
    data,
    backgroundColor: colors,
    borderRadius: 6,
  };
}

/**
 * Dataset para gráfico de barras con un solo color
 */
export function createSingleColorBarDataset(
  data: any[],
  label: string = "Cantidad",
  color?: string
): any {
  return {
    label,
    data,
    backgroundColor: color || barChartColors.primary(),
    borderRadius: 6,
  };
}

/**
 * Dataset para gráfico de líneas
 */
export function createLineDataset(
  data: any[],
  label: string,
  index: number
): any {
  const color = lineChartColors.getLineColor(index);

  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    borderWidth: lineChartColors.borderWidth,
    pointRadius: lineChartColors.pointRadius,
    pointHoverRadius: lineChartColors.pointHoverRadius,
    pointBackgroundColor: color,
    pointBorderColor: color,
    pointHoverBackgroundColor: color,
    pointHoverBorderColor: color,
    tension: lineChartColors.tension,
  };
}

/**
 * Opciones comunes para tooltips
 */
export function getTooltipOptions(customCallbacks?: any): any {
  return {
    backgroundColor: tooltipColors.backgroundColor(),
    borderColor: tooltipColors.borderColor(),
    borderWidth: tooltipColors.borderWidth,
    titleColor: tooltipColors.titleColor(),
    bodyColor: tooltipColors.bodyColor(),
    padding: tooltipColors.padding,
    cornerRadius: tooltipColors.cornerRadius,
    ...customCallbacks,
  };
}

/**
 * Opciones comunes para escalas (ejes X e Y)
 */
export function getScaleOptions(): any {
  return {
    grid: {
      color: hslVar("--border", 0.4),
      lineWidth: axisColors.gridLineWidth,
      borderDash: [4, 4],
    },
    ticks: {
      color: axisColors.tickColor(),
      font: { size: axisColors.tickFontSize },
    },
  };
}
