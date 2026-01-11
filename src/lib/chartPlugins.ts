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

            // SAFETY: Ignore known Segment names to prevent overwriting axis labels
            // if this plugin is accidentally attached to a Segment chart.
            const IGNORED_LABELS = new Set(['SUV', 'SEDAN', 'HATCHBACK', 'CONVERTIBLE', 'PICK UP', 'PICKUP', 'VAN', 'COUPE']);
            if (IGNORED_LABELS.has(brandName.trim().toUpperCase())) return;

            const cacheKey = brandName.trim().toUpperCase();
            let img = logoCache[cacheKey];

            // Load image if not in cache (and not known to fail)
            if (!img && !failedSvgs.has(cacheKey)) {
                img = new Image();
                img.crossOrigin = 'Anonymous';

                // PRIORITY: PNG (Reliable Map) -> SVG (Dynamic Fallback)
                const pngUrl = getBrandLogo(brandName);
                const svgUrl = getBrandSvgUrl(brandName);

                // Use PNG if available in our map (guaranteed valid usually)
                // Otherwise try generic SVG
                if (pngUrl) {
                    img.src = pngUrl;
                    // If PNG fails (rare), try SVG
                    img.onerror = () => {
                        if (svgUrl && img.src !== svgUrl) {
                            img.src = svgUrl;
                            // If SVG also fails, mark as failed
                            img.onerror = () => {
                                failedSvgs.add(cacheKey);
                                chart.draw(); // Redraw to show text
                            };
                        } else {
                            failedSvgs.add(cacheKey);
                            chart.draw();
                        }
                    };
                } else if (svgUrl) {
                    img.src = svgUrl;
                    img.onerror = () => {
                        failedSvgs.add(cacheKey);
                        chart.draw();
                    };
                } else {
                    failedSvgs.add(cacheKey); // No URL at all
                }

                img.onload = () => {
                    chart.draw();
                };

                logoCache[cacheKey] = img;
            }

            const xPos = x.getPixelForTick(index);
            const yPos = x.top + 10; // Position below axis line
            const tickWidth = x.width / x.ticks.length;
            const availableWidth = Math.min(60, tickWidth - 4); // Keep some padding

            // Check if we can draw image
            const shouldDrawImage = img && img.complete && img.naturalHeight !== 0;

            if (shouldDrawImage) {
                const maxWidth = Math.max(20, availableWidth);
                const maxHeight = 35;
                const ratio = img.naturalWidth / img.naturalHeight;

                let width = maxWidth;
                let height = width / ratio;

                if (height > maxHeight) {
                    height = maxHeight;
                    width = height * ratio;
                }

                // Draw image
                try {
                    ctx.drawImage(img, xPos - width / 2, yPos, width, height);
                } catch (e) {
                    // Fallback to text if draw fails
                    drawTextFallback(ctx, brandName, xPos, yPos);
                }
            } else {
                // FALLBACK: Draw Text
                drawTextFallback(ctx, brandName, xPos, yPos);
            }
        });
    }
};

function drawTextFallback(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
    ctx.save();
    ctx.fillStyle = '#64748b'; // muted-foreground color
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Truncate if too long
    const displayText = text.length > 8 ? text.substring(0, 8) + '..' : text;

    // Add a slight offset to align with where images would be
    ctx.fillText(displayText, x, y + 5);
    ctx.restore();
}

