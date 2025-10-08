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
    console.log('Processing JSON upload with batchId:', batchId);
    console.log('Data length:', jsonData.length);

    // Create scraping job
    const { data: job, error: jobError } = await supabaseClient
      .from('scraping_jobs')
      .insert({
        id: batchId,
        status: 'processing',
        total_products: jsonData.length,
        completed_products: 0
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      throw jobError;
    }

    let processedCount = 0;
    const results = [];

    for (const item of jsonData as JsonData[]) {
      try {
        // Validate required fields first
        const categoria = item["Categoría"] || item.Categoría;
        const modeloPrincipal = item["Modelo Principal"];
        const modelo = item.Modelo;
        const precioTexto = item.Precio_Texto;

        if (!categoria || categoria.trim() === '') {
          console.error('Missing or empty Categoría field');
          results.push({ item, error: 'Campo obligatorio faltante: Categoría' });
          continue;
        }
        if (!modeloPrincipal || modeloPrincipal.trim() === '') {
          console.error('Missing or empty Modelo Principal field');
          results.push({ item, error: 'Campo obligatorio faltante: Modelo Principal' });
          continue;
        }
        if (!modelo || modelo.trim() === '') {
          console.error('Missing or empty Modelo field');
          results.push({ item, error: 'Campo obligatorio faltante: Modelo' });
          continue;
        }
        if (!precioTexto || precioTexto.trim() === '') {
          console.error('Missing or empty Precio_Texto field');
          results.push({ item, error: 'Campo obligatorio faltante: Precio_Texto' });
          continue;
        }

        // Generate missing fields
        const uid = item.UID || crypto.randomUUID().replace(/-/g, '').substring(0, 12);
        const fecha = item.Fecha || new Date().toISOString().split('T')[0];
        const timestamp = item.Timestamp || new Date().toISOString();

        console.log('Processing item with UID:', uid);
        
        const productData = {
          brand: categoria,
          category: categoria,
          model: modeloPrincipal,
          name: modelo,
          id_base: item.ID_Base,
          submodel: modelo
        };
        
        console.log('Product data:', JSON.stringify(productData, null, 2));

        let { data: product, error: productError } = await supabaseClient
          .from('products')
          .select('id')
          .eq('id_base', item.ID_Base)
          .maybeSingle();

        if (!product) {
          const { data: newProduct, error: insertError } = await supabaseClient
            .from('products')
            .insert(productData)
            .select('id')
            .single();

          if (insertError) {
            console.error('Error creating product:', insertError);
            results.push({ item, error: insertError.message });
            continue;
          }
          product = newProduct;
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
        
        console.log('Price data:', JSON.stringify(priceData, null, 2));

        const { error: priceError } = await supabaseClient
          .from('price_data')
          .insert(priceData);

        if (priceError) {
          console.error('Error inserting price:', priceError);
          results.push({ item, error: priceError.message });
        } else {
          results.push({ item, success: true });
        }

        processedCount++;

        // Update job progress
        await supabaseClient
          .from('scraping_jobs')
          .update({ completed_products: processedCount })
          .eq('id', batchId);

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

    console.log('Job completed. Processed:', processedCount, 'Total:', jsonData.length);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: batchId,
        processed: processedCount,
        total: jsonData.length,
        results
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