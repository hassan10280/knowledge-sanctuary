
-- Bundle Discounts table
CREATE TABLE public.bundle_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_wholesale BOOLEAN NOT NULL DEFAULT false,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  min_qty INTEGER NOT NULL DEFAULT 2,
  max_discount_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bundle items (which books are in the bundle)
CREATE TABLE public.bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES public.bundle_discounts(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bundle_id, book_id)
);

-- Discount stacking rules
CREATE TABLE public.discount_stacking_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT NOT NULL UNIQUE,
  allowed BOOLEAN NOT NULL DEFAULT false,
  description TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for bundle_discounts
ALTER TABLE public.bundle_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage bundles" ON public.bundle_discounts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read bundles" ON public.bundle_discounts FOR SELECT TO public USING (true);

-- RLS for bundle_items
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage bundle items" ON public.bundle_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read bundle items" ON public.bundle_items FOR SELECT TO public USING (true);

-- RLS for discount_stacking_rules
ALTER TABLE public.discount_stacking_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage stacking rules" ON public.discount_stacking_rules FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read stacking rules" ON public.discount_stacking_rules FOR SELECT TO public USING (true);

-- Insert default stacking rules
INSERT INTO public.discount_stacking_rules (rule_key, allowed, description) VALUES
  ('coupon_plus_quantity', true, 'Allow coupon to stack with quantity tier discount'),
  ('coupon_plus_wholesale', false, 'Allow coupon to stack with wholesale pricing'),
  ('bundle_plus_category', false, 'Allow bundle discount to stack with category discount'),
  ('coupon_plus_order_total', true, 'Allow coupon to stack with order total discount'),
  ('wholesale_plus_other', false, 'Allow wholesale pricing to stack with other discounts');
