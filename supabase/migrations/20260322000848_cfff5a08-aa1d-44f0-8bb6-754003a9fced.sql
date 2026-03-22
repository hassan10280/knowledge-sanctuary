ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id),
  ADD COLUMN IF NOT EXISTS coupon_discount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;