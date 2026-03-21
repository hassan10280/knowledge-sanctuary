
-- Add estimated_delivery_days to shipping_methods
ALTER TABLE public.shipping_methods ADD COLUMN IF NOT EXISTS estimated_delivery_days text DEFAULT '';

-- Add shipping_override_cost to orders (admin manual override)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_override numeric DEFAULT NULL;
