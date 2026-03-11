import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * fetch-brand-logo Edge Function
 * 
 * Given a brand name, this function:
 * 1. Checks if the logo already exists in brand_logos table - if yes, returns it immediately.
 * 2. Otherwise, tries to fetch a logo from external APIs (vectorlogo.zone, then Clearbit).
 * 3. If found, downloads the image, uploads it to Supabase Storage (brand-logos bucket),
 *    and saves the public URL in the brand_logos table.
 * 4. Returns the final URL so the frontend can display it.
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    let body: { brand: string }
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { brand } = body
    if (!brand) {
      return new Response(JSON.stringify({ error: 'brand is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const brandKey = brand.trim().toUpperCase()

    // 1. Check if logo already in DB
    const { data: existing } = await supabaseClient
      .from('brand_logos')
      .select('image_url')
      .eq('brand_name', brandKey)
      .maybeSingle()

    if (existing?.image_url) {
      console.log(`[fetch-brand-logo] Already in DB: ${brandKey}`)
      return new Response(JSON.stringify({ url: existing.image_url, source: 'db' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Build candidate URLs to try (in order of preference)
    const slug = brand.trim().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/\.+/g, '')
      .replace(/[^a-z0-9-]/g, '')

    const specialSlugs: Record<string, string> = {
      'mercedes': 'mercedes-benz',
      'vw': 'volkswagen',
      'chevy': 'chevrolet'
    }
    const resolvedSlug = specialSlugs[slug] || slug

    const candidates = [
      `https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/${resolvedSlug}.png`,
      `https://www.vectorlogo.zone/logos/${resolvedSlug}/${resolvedSlug}-icon.svg`,
      `https://logo.clearbit.com/${resolvedSlug}.com`,
    ]

    let successUrl: string | null = null
    let successBuffer: ArrayBuffer | null = null
    let successContentType = 'image/png'

    for (const candidateUrl of candidates) {
      try {
        console.log(`[fetch-brand-logo] Trying: ${candidateUrl}`)
        const resp = await fetch(candidateUrl, { signal: AbortSignal.timeout(8000) })
        if (!resp.ok) continue

        const buffer = await resp.arrayBuffer()
        const size = buffer.byteLength
        if (size < 200) {
          console.log(`[fetch-brand-logo] Image too small (${size} bytes), skipping`)
          continue
        }

        successUrl = candidateUrl
        successBuffer = buffer
        const ct = resp.headers.get('content-type') || ''
        if (ct.includes('svg')) successContentType = 'image/svg+xml'
        else if (ct.includes('png')) successContentType = 'image/png'
        else if (ct.includes('jpeg') || ct.includes('jpg')) successContentType = 'image/jpeg'
        break
      } catch (e) {
        console.warn(`[fetch-brand-logo] Failed to fetch ${candidateUrl}:`, e)
      }
    }

    if (!successBuffer || !successUrl) {
      console.log(`[fetch-brand-logo] No logo found for: ${brandKey}`)
      return new Response(JSON.stringify({ url: null, source: 'none' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Upload to Supabase Storage
    const ext = successContentType.includes('svg') ? 'svg' : successContentType.includes('jpeg') ? 'jpg' : 'png'
    const filePath = `logos/${brandKey.toLowerCase().replace(/\s+/g, '_')}.${ext}`

    const { error: uploadError } = await supabaseClient.storage
      .from('brand-logos')
      .upload(filePath, successBuffer, {
        contentType: successContentType,
        upsert: true
      })

    if (uploadError) {
      console.error('[fetch-brand-logo] Storage upload error:', uploadError)
      // Return the external URL as fallback even if storage fails
      return new Response(JSON.stringify({ url: successUrl, source: 'external' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4. Get public URL
    const { data: publicUrlData } = supabaseClient.storage
      .from('brand-logos')
      .getPublicUrl(filePath)

    const publicUrl = publicUrlData?.publicUrl ?? successUrl

    // 5. Save to brand_logos table
    const { error: upsertError } = await supabaseClient
      .from('brand_logos')
      .upsert({
        brand_name: brandKey,
        image_url: publicUrl,
        updated_at: new Date().toISOString()
      }, { onConflict: 'brand_name' })

    if (upsertError) {
      console.error('[fetch-brand-logo] DB upsert error:', upsertError)
    } else {
      console.log(`[fetch-brand-logo] Saved to DB: ${brandKey} -> ${publicUrl}`)
    }

    return new Response(JSON.stringify({ url: publicUrl, source: 'saved' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('[fetch-brand-logo] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
