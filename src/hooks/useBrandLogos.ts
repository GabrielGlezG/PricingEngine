import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Global cache to prevent redundant queries across components
let globalLogoCache: Record<string, string> | null = null;
let fetchPromise: Promise<Record<string, string>> | null = null;

export function useBrandLogos() {
    const [logos, setLogos] = useState<Record<string, string>>(globalLogoCache || {});
    const [isLoading, setIsLoading] = useState(!globalLogoCache);

    useEffect(() => {
        if (globalLogoCache) {
            setLogos(globalLogoCache);
            setIsLoading(false);
            return;
        }

        if (!fetchPromise) {
            fetchPromise = (async () => {
                try {
                    const { data, error } = await supabase
                        .from('brand_logos')
                        .select('brand_name, image_url');

                    if (error) throw error;

                    const map: Record<string, string> = {};
                    if (data) {
                        data.forEach((row) => {
                            map[row.brand_name.toUpperCase()] = row.image_url;
                        });
                    }
                    globalLogoCache = map;
                    return map;
                } catch (error) {
                    console.error('Error fetching brand logos:', error);
                    return {};
                }
            })();
        }

        fetchPromise.then((map) => {
            setLogos(map);
            setIsLoading(false);
        });
    }, []);

    const getLogo = (brand: string): string | null => {
        if (!brand) return null;
        return logos[brand.toUpperCase().trim()] || null;
    };

    return { logos, isLoading, getLogo };
}
