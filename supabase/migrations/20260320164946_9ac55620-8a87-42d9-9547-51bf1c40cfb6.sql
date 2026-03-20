
-- Create publishers table
CREATE TABLE public.publishers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.publishers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read publishers" ON public.publishers
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage publishers" ON public.publishers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add cover_image to books
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS cover_image text DEFAULT NULL;

-- Add category-based discount type support to wholesale_discounts
-- (already supports publisher/product, we just use it for category too)
