-- Add tipo_vehiculo column to products table for vehicle type categorization
ALTER TABLE public.products 
ADD COLUMN tipo_vehiculo text;

-- Create index for better filtering performance
CREATE INDEX idx_products_tipo_vehiculo ON public.products(tipo_vehiculo);