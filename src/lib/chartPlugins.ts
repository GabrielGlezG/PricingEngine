import { Plugin } from 'chart.js';
import { getBrandLogo, getBrandSvgUrl, getClearbitLogoUrl } from '@/config/brandLogos';

const logoCache: Record<string, HTMLImageElement> = {};
const failedSvgs: Set<string> = new Set();
const failedImages: Set<string> = new Set();

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
                const clearbitUrl = getClearbitLogoUrl(brandName);

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

                // Strategy: Try SVG -> Try PNG -> Try Clearbit API -> Give up and use Text (failedImages)
                if (svgUrl && !failedSvgs.has(cacheKey)) {
                    img.src = svgUrl;
                    img.onerror = () => {
                        failedSvgs.add(cacheKey);
                        tryPng();
                    };
                } else {
                    tryPng();
                }

                img.onload = () => {
                    chart.draw();
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
            } else if (failedImages.has(cacheKey)) {
                // Draw text fallback
                ctx.save();
                ctx.fillStyle = '#64748b'; // muted text color
                ctx.font = '600 10px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';

                // Truncate long brand names to fit
                const text = brandName.length > 12 ? brandName.substring(0, 9) + '...' : brandName;
                ctx.fillText(text, xPos, yPos + 6); // Add slight padding to center with imaginary logo
                ctx.restore();
            }
        });
    }
};

