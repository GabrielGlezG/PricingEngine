import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JsonData {
  UID: string;
  ID_Base: string;
  Categoría: string;
  "Modelo Principal": string;
  Modelo: string;
  Submodelo?: string; // Re-adding for TS support
  ctx_precio: string;
  precio_num: number;
  precio_lista_num: number;
  bono_num: number;
  Precio_Texto: string;
  fuente_texto_raw: string;
  Modelo_URL: string;
  Archivo_Origen: string;
  Fecha: string;
  Timestamp: string;
  Estado?: string;
  estado?: string;
  Tipo_Vehiculo?: string;
  tipo_vehiculo?: string;
}

// Helper to normalize 'estado' values from Excel/JSON
function normalizeEstado(value: any): 'nuevo' | 'vigente' | 'inactivo' {
  const s = String(value ?? '').trim().toLowerCase();
  if (s === 'nuevo' || s === 'new') return 'nuevo';
  if (s === 'inactivo' || s === 'inactive') return 'inactivo';
  if (s === 'vigente' || s === 'activo' || s === 'active') return 'vigente';
  return 'vigente';
}

async function processBackground(jsonData: JsonData[], batchId: string, supabaseClient: any) {
  try {
    console.log(`[Batch] Starting processing for ${jsonData.length} items. Job ID: ${batchId}`);

    // 1. Pre-process and Deduplicate Products in Memory
    // We use a Map to keep unique products by id_base (last wins or first wins doesnt matter much for static attributes usually, but lets say last wins)
    const uniqueProducts = new Map<string, any>();
    const pricesToInsert: any[] = [];
    const errors: any[] = [];

    // Temporary map to link ID_Base to the raw item for error reporting if needed
    // But since we are doing batch, individual item errors are harder to track during the DB phase.
    // We will track validation errors here.

    for (const item of jsonData) {
      // Basic Validation
      const categoria = item["Categoría"] || item.Categoría;
      const modeloPrincipal = item["Modelo Principal"];
      const modelo = item.Modelo;
      const submodelo = item.Submodelo || modelo; // Fallback to model if submodel missing

      let idBase = item.ID_Base;

      // Auto-generate ID_Base if missing (Deterministic Slug)
      if (!idBase && categoria && modelo) {
        const cleanStr = (str: string) => str ? str.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
        idBase = `${cleanStr(categoria)}-${cleanStr(modelo)}-${cleanStr(submodelo)}`;
        // console.log(`Generated ID_Base: ${idBase}`);
      }

      if (!categoria || !modeloPrincipal || !modelo || !idBase) {
        console.warn(`[Batch] Skipping item due to missing required fields. Category: ${categoria}, Model: ${modelo}, ID_Base: ${idBase}`);
        continue;
      }

      // Normalization
      let rawEstado: unknown = null;
      for (const key in item as any) {
        if (key && key.toLowerCase() === 'estado') {
          rawEstado = (item as any)[key];
          break;
        }
      }
      const estado = normalizeEstado(rawEstado);

      let tipoVehiculo: string | null = null;
      for (const key in item as any) {
        if (key && (key.toLowerCase() === 'tipo_vehiculo' || key.toLowerCase() === 'tipovehiculo' || key.toLowerCase() === 'tipo vehiculo')) {
          tipoVehiculo = (item as any)[key] || null;
          break;
        }
      }

      const productData = {
        brand: categoria,
        category: categoria,
        model: modeloPrincipal,
        name: modelo,
        id_base: idBase,
        submodel: modelo,
        estado: estado,
        tipo_vehiculo: tipoVehiculo
      };

      uniqueProducts.set(idBase, productData);

      // Prepare Price Data (we need product_id, which we don't have yet. So we store the rest)
      // We will link it after product upsert.
      pricesToInsert.push({
        ...item,
        status_normalized: estado // Keep track for logic if needed
      });
    }

    const productsArray = Array.from(uniqueProducts.values());
    console.log(`[Batch] Found ${productsArray.length} unique products to upsert.`);

    // 2. Bulk Upsert Products
    // We expect Supabase to handle "onConflict: id_base"
    const { data: upsertedProducts, error: upsertError } = await supabaseClient
      .from('products')
      .upsert(productsArray, { onConflict: 'id_base' })
      .select('id, id_base');

    if (upsertError) {
      throw new Error(`Critical Error Upserting Products: ${upsertError.message}`);
    }

    if (!upsertedProducts || upsertedProducts.length === 0) {
      console.warn("[Batch] No products returned after upsert. Verify RLS policies if this persists.");
    }

    // 3. Create Map: ID_Base -> Product_UUID
    const productIdMap = new Map<string, string>();
    upsertedProducts?.forEach((p: any) => {
      productIdMap.set(p.id_base, p.id);
    });

    // 4. Prepare Final Price Rows
    const finalPrices = [];

    for (const item of pricesToInsert) {
      const pId = productIdMap.get(item.ID_Base);
      if (!pId) {
        // Should not happen if upsert worked, unless ID_Base was missing in the first place
        continue;
      }

      const uid = item.UID || crypto.randomUUID().replace(/-/g, '').substring(0, 12);
      const fecha = item.Fecha || new Date().toISOString().split('T')[0];
      const timestamp = item.Timestamp || new Date().toISOString();
      const categoria = item["Categoría"] || item.Categoría;
      const precioTexto = item.Precio_Texto || item.precio_texto; // fallback

      finalPrices.push({
        product_id: pId,
        uid: uid,
        store: (categoria || 'DDS') + ' Store',
        price: item.precio_num ? Number(item.precio_num) : 0,
        date: new Date(fecha).toISOString(),
        ctx_precio: item.ctx_precio || null,
        precio_num: item.precio_num ? Number(item.precio_num) : 0,
        precio_lista_num: item.precio_lista_num ? Number(item.precio_lista_num) : null,
        bono_num: item.bono_num ? Number(item.bono_num) : null,
        precio_texto: precioTexto,
        fuente_texto_raw: item.fuente_texto_raw || null,
        modelo_url: item.Modelo_URL || null,
        archivo_origen: item.Archivo_Origen || null,
        timestamp_data: new Date(timestamp).toISOString(),
      });
    }

    console.log(`[Batch] Prepared ${finalPrices.length} price rows for insertion.`);

    // 5. Bulk Insert Prices (Chunked)
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < finalPrices.length; i += CHUNK_SIZE) {
      const chunk = finalPrices.slice(i, i + CHUNK_SIZE);
      const { error: insertError } = await supabaseClient
        .from('price_data')
        .insert(chunk);

      if (insertError) {
        console.error(`[Batch] Error inserting chunk ${i / CHUNK_SIZE}:`, insertError);
        // We log error but try to continue with next chunks to save partial data
        errors.push({ batchIndex: i, message: insertError.message });
      } else {
        // Update progress roughly
        await supabaseClient
          .from('scraping_jobs')
          .update({ completed_products: Math.min(jsonData.length, i + CHUNK_SIZE) })
          .eq('id', batchId);
      }
    }

    // 6. Complete Job
    await supabaseClient
      .from('scraping_jobs')
      .update({
        status: errors.length > 0 ? 'completed_with_errors' : 'completed',
        completed_at: new Date().toISOString(),
        completed_products: jsonData.length, // Ensure 100%
        results: errors.length > 0 ? errors : [{ message: "Batch processing successful" }]
      })
      .eq('id', batchId);

    console.log(`[Batch] Job ${batchId} finished.`);

  } catch (e) {
    console.error(`[Batch] Critical error in job ${batchId}:`, e);
    await supabaseClient
      .from('scraping_jobs')
      .update({
        status: 'failed',
        error_message: e instanceof Error ? e.message : 'Critical processing error',
        completed_at: new Date().toISOString()
      })
      .eq('id', batchId);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: jsonData, batchId } = await req.json();
    console.log('Received JSON upload request with batchId:', batchId);

    // Create scraping job synchronously
    const { error: jobError } = await supabaseClient
      .from('scraping_jobs')
      .insert({
        id: batchId,
        status: 'processing',
        total_products: jsonData.length,
        completed_products: 0
      });

    if (jobError) {
      console.error('Error creating job:', jobError);
      throw jobError;
    }

    // Start background processing
    const backgroundPromise = processBackground(jsonData, batchId, supabaseClient);

    // Use EdgeRuntime.waitUntil if available to prevent worker termination
    // @ts-ignore
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(backgroundPromise);
      console.log("Passed processing to EdgeRuntime.waitUntil");
    } else {
      // Fallback or dev environment
      console.log("EdgeRuntime not found, promise floating (might be terminated early in some envs)");
      backgroundPromise.catch(e => console.error("Unhandled background error", e));
    }

    // Return immediate success
    return new Response(
      JSON.stringify({
        success: true,
        jobId: batchId,
        message: "File accepted. Processing running in background."
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: unknown) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});