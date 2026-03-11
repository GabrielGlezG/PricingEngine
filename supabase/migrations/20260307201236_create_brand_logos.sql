-- Create brand_logos table
CREATE TABLE IF NOT EXISTS public.brand_logos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand_name TEXT NOT NULL UNIQUE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_brand_logos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_brand_logos_updated_at
BEFORE UPDATE ON public.brand_logos
FOR EACH ROW
EXECUTE FUNCTION update_brand_logos_updated_at();

-- Set up Row Level Security (RLS) for brand_logos table
ALTER TABLE public.brand_logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to brand_logos"
    ON public.brand_logos
    FOR SELECT
    USING (true);

-- Create storage bucket for brand logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up Storage RLS policies for the brand-logos bucket
CREATE POLICY "Allow public read access to brand-logos bucket"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'brand-logos');

CREATE POLICY "Allow authenticated users to insert logos"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'brand-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update logos"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'brand-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete logos"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'brand-logos' AND auth.role() = 'authenticated');
