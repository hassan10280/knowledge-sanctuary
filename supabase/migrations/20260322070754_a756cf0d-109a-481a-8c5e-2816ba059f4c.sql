
-- Add auto_apply and first_order_only to coupons
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS auto_apply BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS first_order_only BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_discount_amount NUMERIC;

-- Add max_discount_cap to wholesale_discounts
ALTER TABLE public.wholesale_discounts ADD COLUMN IF NOT EXISTS max_discount_amount NUMERIC;

-- Add max_discount_cap to retail_discounts
ALTER TABLE public.retail_discounts ADD COLUMN IF NOT EXISTS max_discount_amount NUMERIC;
