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
    let processedCount = 0;
    const results = [];

    console.log(`[Background] Starting to process ${jsonData.length} items for job ${batchId}`);

    for (const item of jsonData) {
      processedCount++; // Increment count for every item attempted

      try {
        // Validate required fields first
        const categoria = item["Categoría"] || item.Categoría;
        const modeloPrincipal = item["Modelo Principal"];
        const modelo = item.Modelo;
        const precioTexto = item.Precio_Texto;

        if (!categoria || categoria.trim() === '') {
          results.push({ item, error: 'Campo obligatorio faltante: Categoría' });
          continue;
        }
        if (!modeloPrincipal || modeloPrincipal.trim() === '') {
          results.push({ item, error: 'Campo obligatorio faltante: Modelo Principal' });
          continue;
        }
        if (!modelo || modelo.trim() === '') {
          results.push({ item, error: 'Campo obligatorio faltante: Modelo' });
          continue;
        }
        if (!precioTexto || precioTexto.trim() === '') {
          results.push({ item, error: 'Campo obligatorio faltante: Precio_Texto' });
          continue;
        }

        // Generate missing fields
        const uid = item.UID || crypto.randomUUID().replace(/-/g, '').substring(0, 12);
        const fecha = item.Fecha || new Date().toISOString().split('T')[0];
        const timestamp = item.Timestamp || new Date().toISOString();

        // Extract 'estado'
        let rawEstado: unknown = null;
        for (const key in item as any) {
          if (key && key.toLowerCase() === 'estado') {
            rawEstado = (item as any)[key];
            break;
          }
        }
        const estado = normalizeEstado(rawEstado);

        // Extract 'tipo_vehiculo'
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
          id_base: item.ID_Base,
          submodel: modelo,
          estado: estado,
          tipo_vehiculo: tipoVehiculo
        };

        // Optimize with Upsert
        const { data: product, error: upsertError } = await supabaseClient
          .from('products')
          .upsert(productData, { onConflict: 'id_base' })
          .select('id')
          .single();

        if (upsertError) {
          results.push({ item, error: upsertError.message });
          continue;
        }

        // Insert price data
        const priceData = {
          product_id: product.id,
          uid: uid,
          store: categoria + ' Store',
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
        };

        const { error: priceError } = await supabaseClient
          .from('price_data')
          .insert(priceData);

        if (priceError) {
          results.push({ item, error: priceError.message });
        } else {
          results.push({ item, success: true });
        }

        // Periodic update every 20 items or last item to reduce DB spam
        if (processedCount % 20 === 0 || processedCount === jsonData.length) {
          await supabaseClient
            .from('scraping_jobs')
            .update({ completed_products: processedCount })
            .eq('id', batchId);
        }

      } catch (error) {
        console.error('Error processing item:', error);
        results.push({ item, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // Complete job
    await supabaseClient
      .from('scraping_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        results: results
      })
      .eq('id', batchId);

    console.log(`[Background] Job ${batchId} completed.`);

  } catch (e) {
    console.error(`[Background] Critical error in job ${batchId}:`, e);
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