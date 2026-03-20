
-- Add 'wholesale' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'wholesale';

-- Wholesale form fields (admin-configurable form builder)
CREATE TABLE IF NOT EXISTS public.wholesale_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_type text NOT NULL DEFAULT 'text',
  label text NOT NULL,
  placeholder text DEFAULT '',
  required boolean DEFAULT false,
  options jsonb DEFAULT '[]',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wholesale_form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read form fields" ON public.wholesale_form_fields
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage form fields" ON public.wholesale_form_fields
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Wholesale applications
CREATE TABLE IF NOT EXISTS public.wholesale_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  form_data jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  admin_notes text DEFAULT '',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wholesale_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own applications" ON public.wholesale_applications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own applications" ON public.wholesale_applications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update applications" ON public.wholesale_applications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Wholesale discounts (publisher-based and product-based)
CREATE TABLE IF NOT EXISTS public.wholesale_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_type text NOT NULL DEFAULT 'publisher',
  reference_value text NOT NULL,
  discount_percent numeric NOT NULL DEFAULT 0,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wholesale_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read wholesale discounts" ON public.wholesale_discounts
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage wholesale discounts" ON public.wholesale_discounts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add publisher column to books if not exists
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS publisher text DEFAULT '';

-- Insert default wholesale form fields
INSERT INTO public.wholesale_form_fields (field_type, label, placeholder, required, sort_order) VALUES
  ('text', 'Full Name', 'Enter your full name', true, 1),
  ('text', 'Business Name', 'Enter your business name', true, 2),
  ('phone', 'Phone Number', '+44 000 000 0000', true, 3),
  ('email', 'Email Address', 'your@email.com', true, 4),
  ('textarea', 'Business Address', 'Enter your full business address', true, 5),
  ('dropdown', 'Type of Business', 'Select business type', true, 6),
  ('number', 'Estimated Monthly Purchase (£)', '0', false, 7),
  ('textarea', 'Additional Notes', 'Any additional information...', false, 8);

-- Set dropdown options for "Type of Business"
UPDATE public.wholesale_form_fields 
SET options = '["Retailer", "Distributor", "Other"]'::jsonb 
WHERE label = 'Type of Business';
