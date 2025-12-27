
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FilterState {
    tipoVehiculo: string[];
    brand: string[];
    model: string[];
    submodel: string[];
    priceRange?: [number, number];
    [key: string]: any;
}

export function useInterconnectedFilters(
    filters: FilterState,
    setFilters: React.Dispatch<React.SetStateAction<any>>,
    prefix: string = "default"
) {

    const { data: tiposVehiculo } = useQuery({
        queryKey: [`${prefix}-tiposVehiculo`],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("products")
                .select("tipo_vehiculo")
                .not("tipo_vehiculo", "is", null)
                .order("tipo_vehiculo");

            if (error) throw error;
            return [...new Set(data.map((p) => p.tipo_vehiculo).filter(Boolean))] as string[];
        },
    });

    const { data: brands } = useQuery({
        queryKey: [`${prefix}-brands`, filters.tipoVehiculo],
        queryFn: async () => {
            let query = supabase
                .from("products")
                .select("brand")
                .order("brand");

            if (filters.tipoVehiculo.length > 0) {
                query = query.in("tipo_vehiculo", filters.tipoVehiculo);
            }

            const { data, error } = await query;
            if (error) throw error;
            const uniqueBrands = [...new Set(data.map(item => item.brand))].sort();
            return uniqueBrands;
        },
    });

    const { data: models } = useQuery({
        queryKey: [`${prefix}-models`, filters.brand, filters.tipoVehiculo],
        queryFn: async () => {
            let query = supabase
                .from("products")
                .select("model, name, brand")
                .order("model");

            if (filters.brand.length > 0) {
                query = query.in("brand", filters.brand);
            }
            if (filters.tipoVehiculo.length > 0) {
                query = query.in("tipo_vehiculo", filters.tipoVehiculo);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Some components expect objects {model, name, brand}, others just strings.
            // Dashboard uses objects for mapping names, but others use strings.
            // DashboardFilters accepts strings for options.
            // Dashboard.tsx mapped manually.
            // Let's standardise on returning objects? No, DashboardFilters takes strings usually.
            // BUT Dashboard.tsx uses `model.model` and `model.name`.
            // Let's return objects to be safe and let consumers map.
            return Array.from(
                new Map(
                    data.map((p) => [
                        p.model,
                        { model: p.model, name: p.name, brand: p.brand },
                    ])
                ).values()
            );
        },
    });

    const { data: submodels } = useQuery({
        queryKey: [`${prefix}-submodels`, filters.brand, filters.model, filters.tipoVehiculo],
        queryFn: async () => {
            let query = supabase
                .from("products")
                .select("submodel, brand, model")
                .not("submodel", "is", null)
                .order("submodel");

            if (filters.brand.length > 0) {
                query = query.in("brand", filters.brand);
            }
            if (filters.model.length > 0) {
                query = query.in("model", filters.model);
            }
            if (filters.tipoVehiculo.length > 0) {
                query = query.in("tipo_vehiculo", filters.tipoVehiculo);
            }

            const { data, error } = await query;
            if (error) throw error;
            return [...new Set(data.map((p) => p.submodel).filter(Boolean))];
        },
    });

    // Cleanup Effects
    useEffect(() => {
        if (brands && filters.brand.length > 0) {
            const validBrands = filters.brand.filter(b => brands.includes(b));
            if (validBrands.length !== filters.brand.length) {
                setFilters(prev => ({ ...prev, brand: validBrands }));
            }
        }
    }, [brands, filters.brand, setFilters]);

    useEffect(() => {
        if (models && filters.model.length > 0) {
            const validModelNames = models.map(m => m.model);
            const validFilters = filters.model.filter(m => validModelNames.includes(m));
            if (validFilters.length !== filters.model.length) {
                setFilters(prev => ({ ...prev, model: validFilters }));
            }
        }
    }, [models, filters.model, setFilters]);

    useEffect(() => {
        if (submodels && filters.submodel.length > 0) {
            const validFilters = filters.submodel.filter(s => submodels.includes(s));
            if (validFilters.length !== filters.submodel.length) {
                setFilters(prev => ({ ...prev, submodel: validFilters }));
            }
        }
    }, [submodels, filters.submodel, setFilters]);

    return {
        tiposVehiculo,
        brands,
        models,
        submodels
    };
}
