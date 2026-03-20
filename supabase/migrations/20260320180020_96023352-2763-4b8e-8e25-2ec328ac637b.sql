
-- Retail discounts table (simple: product or category based)
CREATE TABLE public.retail_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_type text NOT NULL DEFAULT 'product',
  reference_value text NOT NULL,
  book_id uuid,
  discount_percent numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.retail_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage retail discounts"
  ON public.retail_discounts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read retail discounts"
  ON public.retail_discounts FOR SELECT TO public
  USING (true);
