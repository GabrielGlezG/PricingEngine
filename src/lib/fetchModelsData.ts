import { supabase } from "@/integrations/supabase/client";

export interface ModelData {
    model: string;
    submodel: string | null;
    brand: string;
    name: string;
    estado: string | null;
    count: number;
    precio_con_bono: number | null;
    precio_lista: number | null;
    bono: number | null;
    tipo_vehiculo: string | null;
}

interface FetchModelsOptions {
    filters: {
        tipoVehiculo?: string | string[];
        brand?: string | string[];
        model?: string | string[];
        submodel?: string | string[];
    };
    statusFilter?: 'all' | 'active' | 'inactive';
}

export const fetchModelsData = async ({ filters, statusFilter = 'all' }: FetchModelsOptions): Promise<ModelData[]> => {
    // Get latest prices with product details
    const { data: priceData, error } = await supabase
        .from('price_data')
        .select(`
      product_id,
      price,
      precio_texto,
      precio_lista_num,
      bono_num,
      date,
      products!inner(
        id,
        name,
        brand,
        model,
        submodel,
        estado,
        tipo_vehiculo
      )
    `)
        .order('date', { ascending: false });

    if (error) throw error;

    // Group by product and get latest entry
    const productMap = new Map<string, any>();

    priceData?.forEach((item: any) => {
        const productId = item.product_id;
        const product = item.products;

        // Apply filters (only if array has values)
        const tipoArr = Array.isArray(filters.tipoVehiculo) ? filters.tipoVehiculo : filters.tipoVehiculo ? [filters.tipoVehiculo] : [];
        if (tipoArr.length > 0 && !tipoArr.includes(product.tipo_vehiculo)) return;

        const brandArr = Array.isArray(filters.brand) ? filters.brand : filters.brand ? [filters.brand] : [];
        if (brandArr.length > 0 && !brandArr.includes(product.brand)) return;

        const modelArr = Array.isArray(filters.model) ? filters.model : filters.model ? [filters.model] : [];
        if (modelArr.length > 0 && !modelArr.includes(product.model)) return;

        const submodelArr = Array.isArray(filters.submodel) ? filters.submodel : filters.submodel ? [filters.submodel] : [];
        if (submodelArr.length > 0 && !submodelArr.includes(product.submodel)) return;

        // Apply status filter
        const estado = product.estado?.toLowerCase() || 'vigente';
        if (statusFilter === 'active' && estado === 'inactivo') return;
        if (statusFilter === 'inactive' && estado !== 'inactivo') return;

        // If statusFilter is 'all', we accept everything

        if (!productMap.has(productId) || new Date(item.date) > new Date(productMap.get(productId).date)) {
            productMap.set(productId, {
                ...item,
                product
            });
        }
    });

    // Aggregate by model and submodel
    const modelMap = new Map<string, ModelData>();

    Array.from(productMap.values()).forEach((item) => {
        const product = item.product;
        const modelKey = `${product.brand}-${product.model}-${product.submodel || 'sin-submodelo'}`;

        if (!modelMap.has(modelKey)) {
            modelMap.set(modelKey, {
                model: product.model,
                submodel: product.submodel,
                brand: product.brand,
                name: product.name,
                estado: product.estado,
                tipo_vehiculo: product.tipo_vehiculo,
                count: 0,
                precio_con_bono: null,
                precio_lista: null,
                bono: null,
            });
        }

        const modelData = modelMap.get(modelKey)!;
        modelData.count += 1;

        // Calculate average prices
        const currentCount = modelData.count;

        const precioConBono = item.price || 0;
        const precioLista = item.precio_lista_num || 0;
        const bono = item.bono_num || 0;

        modelData.precio_con_bono = ((modelData.precio_con_bono || 0) * (currentCount - 1) + precioConBono) / currentCount;
        modelData.precio_lista = ((modelData.precio_lista || 0) * (currentCount - 1) + precioLista) / currentCount;
        modelData.bono = ((modelData.bono || 0) * (currentCount - 1) + bono) / currentCount;
    });

    return Array.from(modelMap.values()).sort((a, b) => (b.precio_con_bono || 0) - (a.precio_con_bono || 0));
};
