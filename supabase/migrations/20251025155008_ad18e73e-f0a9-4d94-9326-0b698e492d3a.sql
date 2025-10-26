-- Add estado column to products table
ALTER TABLE public.products 
ADD COLUMN estado TEXT DEFAULT 'activo';

-- Add a comment to document the column
COMMENT ON COLUMN public.products.estado IS 'Estado del vehículo: nuevo, activo, o inactivo';

-- Optionally add a check constraint to ensure valid values
ALTER TABLE public.products 
ADD CONSTRAINT productos_estado_check 
CHECK (estado IN ('nuevo', 'activo', 'inactivo'));