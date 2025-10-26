-- Drop the old constraint with Spanish name
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS productos_estado_check;

-- Ensure the correct constraint exists with the right values
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_estado_check;

ALTER TABLE public.products 
ADD CONSTRAINT products_estado_check 
CHECK (estado IN ('nuevo', 'vigente', 'inactivo'));