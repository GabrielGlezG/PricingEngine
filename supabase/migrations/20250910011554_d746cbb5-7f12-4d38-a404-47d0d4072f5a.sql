-- Add new columns to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS id_base TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS submodel TEXT;

-- Add new columns to price_data table  
ALTER TABLE public.price_data ADD COLUMN IF NOT EXISTS uid TEXT;
ALTER TABLE public.price_data ADD COLUMN IF NOT EXISTS ctx_precio TEXT;
ALTER TABLE public.price_data ADD COLUMN IF NOT EXISTS precio_num BIGINT;
ALTER TABLE public.price_data ADD COLUMN IF NOT EXISTS precio_lista_num BIGINT;
ALTER TABLE public.price_data ADD COLUMN IF NOT EXISTS bono_num BIGINT;
ALTER TABLE public.price_data ADD COLUMN IF NOT EXISTS precio_texto TEXT;
ALTER TABLE public.price_data ADD COLUMN IF NOT EXISTS fuente_texto_raw TEXT;
ALTER TABLE public.price_data ADD COLUMN IF NOT EXISTS modelo_url TEXT;
ALTER TABLE public.price_data ADD COLUMN IF NOT EXISTS archivo_origen TEXT;
ALTER TABLE public.price_data ADD COLUMN IF NOT EXISTS timestamp_data TIMESTAMP WITH TIME ZONE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_id_base ON public.products(id_base);
CREATE INDEX IF NOT EXISTS idx_price_data_ctx_precio ON public.price_data(ctx_precio);
CREATE INDEX IF NOT EXISTS idx_price_data_uid ON public.price_data(uid);