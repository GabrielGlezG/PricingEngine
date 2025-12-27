import { Plugin } from 'chart.js';
import { getBrandLogo, getBrandSvgUrl } from '@/config/brandLogos';

const logoCache: Record<string, HTMLImageElement> = {};
const failedSvgs: Set<string> = new Set();

export const brandAxisLogoPlugin: Plugin = {
    id: 'brandAxisLogo',
    afterDraw(chart) {
        const { ctx, scales: { x } } = chart;

        // Safety checks
        if (!x || !chart.data.labels) return;

        x.ticks.forEach((tick, index) => {
            const brandName = chart.data.labels?.[index] as string;
            if (!brandName) return;

            const cacheKey = brandName.trim().toUpperCase();
            let img = logoCache[cacheKey];

            // Load image if not in cache
            if (!img) {
                img = new Image();
                img.crossOrigin = 'Anonymous';

                const svgUrl = getBrandSvgUrl(brandName);
                const pngUrl = getBrandLogo(brandName);

                // Strategy: Try SVG first. If it fails, fallback to PNG.
                if (svgUrl && !failedSvgs.has(cacheKey)) {
                    img.src = svgUrl;
                    img.onerror = () => {
                        // console.warn(`Failed to load SVG for ${brandName}, falling back to PNG`);
                        failedSvgs.add(cacheKey);
                        if (pngUrl) {
                            img.src = pngUrl;
                        }
                    };
                } else if (pngUrl) {
                    img.src = pngUrl;
                } else {
                    return; // No URL found
                }

                img.onload = () => {
                    chart.draw();
                };

                logoCache[cacheKey] = img;
            }

            // Draw if loaded
            if (img.complete && img.naturalHeight !== 0) {
                const xPos = x.getPixelForTick(index);
                const yPos = x.top + 10; // Position below axis line
                const size = 30; // Optimized size for vector logos

                try {
                    // Draw image centered horizontally
                    ctx.drawImage(img, xPos - size / 2, yPos, size, size);
                } catch (e) {
                    // Ignore transient errors
                }
            }
        });
    }
};

