-- Create a specific view for Dashboard Analytics
-- This view returns only the LATEST price for each product, preventing the "History Flood" issue
-- and ensuring we see all 50+ brands without fetching millions of historical rows.

CREATE OR REPLACE VIEW latest_prices_view AS
SELECT DISTINCT ON (p.product_id)
    p.id AS price_id,
    p.price,
    p.date,
    p.store,
    p.ctx_precio,
    p.precio_num,
    p.precio_lista_num,
    p.bono_num,
    p.precio_texto,
    prod.id AS product_id,
    prod.brand,
    prod.model,
    prod.submodel,
    prod.name,
    prod.category,
    prod.tipo_vehiculo
FROM price_data p
JOIN products prod ON p.product_id = prod.id
ORDER BY p.product_id, p.date DESC;

-- Grant access to authenticated users (and anon if needed for testing, but typically just auth)
GRANT SELECT ON latest_prices_view TO authenticated;
GRANT SELECT ON latest_prices_view TO service_role;
