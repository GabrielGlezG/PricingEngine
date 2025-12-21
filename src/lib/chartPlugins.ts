import { Plugin } from 'chart.js';
import brandLogoMap from '@/config/brandLogos';

const logoCache: Record<string, HTMLImageElement> = {};

export const brandAxisLogoPlugin: Plugin = {
    id: 'brandAxisLogo',
    afterDraw(chart) {
        const { ctx, scales: { x } } = chart;

        // Safety checks
        if (!x || !chart.data.labels) return;

        x.ticks.forEach((tick, index) => {
            const brandName = chart.data.labels?.[index] as string;
            if (!brandName) return;

            const normalizedBrand = brandName.toString().trim().toUpperCase();
            const logoUrl = brandLogoMap[normalizedBrand];

            // If no logo, we fall back to existing label logic (text is already transparent/hidden via options)
            // or we could draw text here if we wanted mix mode.
            if (!logoUrl) return;

            let img = logoCache[logoUrl];

            // Load image if not in cache
            if (!img) {
                img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = logoUrl;
                // Trigger chart update once loaded to render it
                img.onload = () => {
                    // console.log('Logo loaded:', logoUrl);
                    chart.draw();
                };
                logoCache[logoUrl] = img;
            } else {
                // console.log('Logo found in cache:', logoUrl);
            }

            // Draw if loaded
            if (img.complete && img.naturalHeight !== 0) {
                const xPos = x.getPixelForTick(index);
                const yPos = x.top + 10; // Position below axis line, ignoring tick height
                const size = 28; // Slightly larger for better visibility

                // Draw image centered horizontally
                try {
                    ctx.drawImage(img, xPos - size / 2, yPos, size, size);
                } catch (e) {
                    // Ignore inconsistent state errors during resize
                }
            }
        });
    }
};
