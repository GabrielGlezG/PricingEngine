-- Create an aggregated view specifically for the Price-Volume Matrix (Bubble Chart)
-- This performs the "Group By Model" operation in the DB, reducing 50k+ listings to ~500 model rows.
-- This guarantees we receive ALL brands/models regardless of inventory size.

CREATE OR REPLACE VIEW analytics_models_view AS
SELECT 
    p.brand,
    p.model AS model_principal,
    p.category,
    p.tipo_vehiculo,
    COUNT(*) as count,
    AVG(p.price) as avg_price,
    MIN(p.price) as min_price,
    MAX(p.price) as max_price
FROM latest_prices_view p
GROUP BY p.brand, p.model, p.category, p.tipo_vehiculo;

GRANT SELECT ON analytics_models_view TO authenticated;
GRANT SELECT ON analytics_models_view TO service_role;
