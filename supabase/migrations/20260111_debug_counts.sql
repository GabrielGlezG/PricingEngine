-- Debug script to verify the actual counts of versions per model in the View
-- This works as a ground truth to verify if the Application is receiving correct data
CREATE OR REPLACE FUNCTION debug_model_counts()
RETURNS TABLE (
  brand text,
  model text,
  count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.brand, 
    p.model, 
    COUNT(*) as count
  FROM latest_prices_view p
  GROUP BY p.brand, p.model
  ORDER BY count DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;
