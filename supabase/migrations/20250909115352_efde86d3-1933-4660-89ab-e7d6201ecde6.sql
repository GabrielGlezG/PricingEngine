-- Update products table to match new Excel format
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS id_base text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS submodel text;

-- Update price_data table to match new Excel format  
ALTER TABLE public.price_data ADD COLUMN IF NOT EXISTS ctx_precio text;
ALTER TABLE public.price_data ADD COLUMN IF NOT EXISTS precio_lista_num bigint;
ALTER TABLE public.price_data ADD COLUMN IF NOT EXISTS bono_num bigint;
ALTER TABLE public.price_data ADD COLUMN IF NOT EXISTS precio_texto text;
ALTER TABLE public.price_data ADD COLUMN IF NOT EXISTS fuente_texto_raw text;
ALTER TABLE public.price_data ADD COLUMN IF NOT EXISTS modelo_url text;
ALTER TABLE public.price_data ADD COLUMN IF NOT EXISTS archivo_origen text;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_id_base ON public.products(id_base);
CREATE INDEX IF NOT EXISTS idx_price_data_archivo_origen ON public.price_data(archivo_origen);