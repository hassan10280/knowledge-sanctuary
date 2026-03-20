
-- 1. Add fixed_price column to wholesale_discounts
ALTER TABLE public.wholesale_discounts ADD COLUMN IF NOT EXISTS fixed_price numeric DEFAULT NULL;

-- 2. Quantity-based discount tiers for wholesale
CREATE TABLE public.wholesale_quantity_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_qty integer NOT NULL,
  max_qty integer DEFAULT NULL,
  discount_percent numeric NOT NULL DEFAULT 0,
  scope text NOT NULL DEFAULT 'cart',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wholesale_quantity_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage quantity tiers" ON public.wholesale_quantity_tiers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read quantity tiers" ON public.wholesale_quantity_tiers
  FOR SELECT TO public USING (true);

-- 3. Coupons / promo codes
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_amount numeric DEFAULT 0,
  expiry_date timestamptz DEFAULT NULL,
  usage_limit integer DEFAULT NULL,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  wholesale_only boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read active coupons" ON public.coupons
  FOR SELECT TO public USING (true);

-- 4. Shipping rules
CREATE TABLE public.shipping_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL DEFAULT '',
  min_amount numeric NOT NULL DEFAULT 0,
  shipping_cost numeric NOT NULL DEFAULT 0,
  is_wholesale boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage shipping rules" ON public.shipping_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read shipping rules" ON public.shipping_rules
  FOR SELECT TO public USING (true);
