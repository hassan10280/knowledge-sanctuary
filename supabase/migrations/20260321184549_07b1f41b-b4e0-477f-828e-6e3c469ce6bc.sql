
-- Shipping Zones
CREATE TABLE public.shipping_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  locations text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shipping zones" ON public.shipping_zones
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage shipping zones" ON public.shipping_zones
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Shipping Methods
CREATE TABLE public.shipping_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shipping methods" ON public.shipping_methods
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage shipping methods" ON public.shipping_methods
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Shipping Rates (zone + method + role combination)
CREATE TABLE public.shipping_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid REFERENCES public.shipping_zones(id) ON DELETE CASCADE NOT NULL,
  method_id uuid REFERENCES public.shipping_methods(id) ON DELETE CASCADE NOT NULL,
  rate_type text NOT NULL DEFAULT 'flat',
  flat_rate numeric DEFAULT 0,
  price_ranges jsonb DEFAULT '[]',
  is_wholesale boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shipping rates" ON public.shipping_rates
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage shipping rates" ON public.shipping_rates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Free Shipping Rules (role-based)
CREATE TABLE public.free_shipping_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  min_order_amount numeric NOT NULL DEFAULT 0,
  is_wholesale boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  always_free boolean NOT NULL DEFAULT false,
  zone_id uuid REFERENCES public.shipping_zones(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.free_shipping_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read free shipping rules" ON public.free_shipping_rules
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage free shipping rules" ON public.free_shipping_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Enable realtime for shipping tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipping_zones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipping_methods;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipping_rates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.free_shipping_rules;
