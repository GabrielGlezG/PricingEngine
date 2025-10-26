-- Update the CHECK constraint to use 'vigente' instead of 'activo'
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_estado_check;

ALTER TABLE public.products 
ADD CONSTRAINT products_estado_check 
CHECK (estado IN ('nuevo', 'vigente', 'inactivo'));

-- Update the default value to 'vigente'
ALTER TABLE public.products 
ALTER COLUMN estado SET DEFAULT 'vigente';

-- Update existing 'activo' records to 'vigente'
UPDATE public.products 
SET estado = 'vigente' 
WHERE estado = 'activo';

COMMENT ON COLUMN public.products.estado IS 'Estado del producto: nuevo, vigente, o inactivo';