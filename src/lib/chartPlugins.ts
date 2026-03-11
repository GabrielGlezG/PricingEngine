import { Plugin } from 'chart.js';
import { getBrandLogo, getBrandSvgUrl, getClearbitLogoUrl } from '@/config/brandLogos';

// Global cache for the database logos injected from React
let dbLogoCache: Record<string, string> = {};

export const setDbLogos = (logos: Record<string, string>) => {
    dbLogoCache = logos;
};

const logoCache: Record<string, HTMLImageElement> = {};
const failedSvgs: Set<string> = new Set();
const failedImages: Set<string> = new Set();

export const brandAxisLogoPlugin: Plugin = {
    id: 'brandAxisLogo',
    afterDraw(chart) {
        // If the chart actively disables this plugin (or if it's not explicitly the brand axis), skip.
        // But since it's injected per-chart in Dashboard.tsx, let's just make sure we don't double-draw 
        // if the text isn't a recognized brand or if we can heuristically tell it's not a brand chart.
        const { ctx, scales: { x } } = chart;

        // Safety checks
        if (!x || !chart.data.labels) return;

        // Optional: you can pass custom options to the plugin via chart.options.plugins.brandAxisLogo
        // If a chart sets `enabled: false`, we skip.
        if (chart.options?.plugins?.brandAxisLogo?.enabled === false) return;

        x.ticks.forEach((tick, index) => {
            const brandName = chart.data.labels?.[index] as string;
            if (!brandName) return;

            // Heuristic to prevent drawing on non-brand charts (like Segment: SUV, Sedan, Hatchback)
            const nonBrands = new Set(['SUV', 'SEDAN', 'HATCHBACK', 'PICKUP', 'VAN/FURGÓN', 'COMERCIAL', 'ELÉCTRICO', 'HÍBRIDO', 'CITYCAR']);
            const cacheKey = brandName.trim().toUpperCase();

            if (nonBrands.has(cacheKey)) {
                return; // Skip drawing any custom logo or text for generic vehicle categories
            }

            let img = logoCache[cacheKey];

            // Load image if not in cache
            if (!img) {
                img = new Image();
                img.crossOrigin = 'Anonymous';

                const svgUrl = getBrandSvgUrl(brandName);
                const pngUrl = getBrandLogo(brandName);
                const clearbitUrl = getClearbitLogoUrl(brandName);
                const dbUrl = dbLogoCache[cacheKey];

                const handleTotalFailure = () => {
                    failedImages.add(cacheKey);
                    chart.draw();
                };

                const tryClearbit = () => {
                    if (clearbitUrl) {
                        img.src = clearbitUrl;
                        img.onerror = handleTotalFailure;
                    } else {
                        handleTotalFailure();
                    }
                };

                const tryPng = () => {
                    if (pngUrl) {
                        img.src = pngUrl;
                        img.onerror = tryClearbit;
                    } else {
                        tryClearbit();
                    }
                };

                const trySvg = () => {
                    if (svgUrl && !failedSvgs.has(cacheKey)) {
                        img.src = svgUrl;
                        img.onerror = () => {
                            failedSvgs.add(cacheKey);
                            tryPng();
                        };
                    } else {
                        tryPng();
                    }
                };

                // Strategy: Try DB -> Try PNG -> Try SVG -> Try Clearbit API -> Give up and use Text (failedImages)
                if (dbUrl) {
                    img.src = dbUrl;
                    img.onerror = () => {
                        tryPng();
                    };
                } else {
                    tryPng();
                }

                img.onload = () => {
                    // Check for invisible 1x1 clearbit images
                    if (img.naturalWidth <= 1 || img.naturalHeight <= 1) {
                        if (dbUrl && img.src === dbUrl) {
                            tryPng();
                        } else if (pngUrl && img.src === pngUrl) {
                            trySvg();
                        } else if (svgUrl && img.src === svgUrl) {
                            tryClearbit();
                        } else {
                            handleTotalFailure();
                        }
                    } else {
                        chart.draw();
                    }
                };

                logoCache[cacheKey] = img;
            }

            const xPos = x.getPixelForTick(index);
            const yPos = x.top + 12; // Position below axis line

            // Draw if loaded
            if (img.complete && img.naturalHeight !== 0 && !failedImages.has(cacheKey)) {
                // Dynamic width calculation to prevent overlap
                const tickWidth = x.width / x.ticks.length;
                const availableWidth = Math.min(60, tickWidth - 8); // Max 60px or available space minus padding

                const maxWidth = Math.max(20, availableWidth); // Ensure at least 20px visible
                const maxHeight = 35;
                const ratio = img.naturalWidth / img.naturalHeight;

                let width = maxWidth;
                let height = width / ratio;

                if (height > maxHeight) {
                    height = maxHeight;
                    width = height * ratio;
                }

                // If width still exceeds available, constrain by width again (redundant but safe)
                if (width > maxWidth) {
                    width = maxWidth;
                    height = width / ratio;
                }

                try {
                    // Draw image centered horizontally
                    ctx.drawImage(img, xPos - width / 2, yPos, width, height);
                } catch (e) {
                    // Ignore transient errors
                }
            }
        });
    }
};
