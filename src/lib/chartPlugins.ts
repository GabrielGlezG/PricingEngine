import { Plugin } from 'chart.js';
import { getBrandLogo, getBrandSvgUrl, getBrandInitials, getBrandColor } from '@/config/brandLogos';

// Extend HTMLImageElement to track error state for fallbacks
interface CachedImage extends HTMLImageElement {
    hasError?: boolean;
}

const logoCache: Record<string, CachedImage> = {};
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

            const xPos = x.getPixelForTick(index);
            const yPos = x.top + 10; // Position below axis line
            const tickWidth = x.width / x.ticks.length;
            const availableWidth = Math.min(60, tickWidth - 8); // Max 60px or available space minus padding
            const maxWidth = Math.max(20, availableWidth); // Ensure at least 20px visible

            // Draw text fallback function
            const drawFallback = () => {
                const initials = getBrandInitials(brandName);
                const color = getBrandColor(brandName);
                const boxSize = Math.min(24, maxWidth);

                ctx.save();
                // Draw background box
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.roundRect(xPos - boxSize / 2, yPos, boxSize, boxSize, 4);
                ctx.fill();

                // Draw text
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `bold ${boxSize * 0.5}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(initials, xPos, yPos + boxSize / 2);
                ctx.restore();
            };

            // Load image if not in cache
            if (!img) {
                img = new Image() as CachedImage;
                img.crossOrigin = 'Anonymous';
                img.hasError = false;

                const svgUrl = getBrandSvgUrl(brandName);
                const pngUrl = getBrandLogo(brandName);

                // Strategy: Try SVG first (Quality). If it fails, fallback to PNG.
                if (svgUrl && !failedSvgs.has(cacheKey)) {
                    img.src = svgUrl;
                    img.onerror = () => {
                        failedSvgs.add(cacheKey);
                        if (pngUrl) {
                            img.src = pngUrl;
                        } else {
                            img.hasError = true;
                            chart.draw(); // Trigger re-draw for fallback
                        }
                    };
                } else if (pngUrl) {
                    img.src = pngUrl;
                    img.onerror = () => {
                        img.hasError = true;
                        chart.draw(); // Trigger re-draw for fallback
                    };
                } else {
                    img.hasError = true; // No URL found, mark as error immediately
                }

                img.onload = () => {
                    chart.draw();
                };

                logoCache[cacheKey] = img;
            }

            // Draw logic
            if (img.hasError) {
                drawFallback();
            } else if (img.complete && img.naturalHeight !== 0) {
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

