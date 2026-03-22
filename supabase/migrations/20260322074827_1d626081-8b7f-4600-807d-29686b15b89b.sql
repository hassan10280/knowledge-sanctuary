
-- Abandoned carts table
CREATE TABLE public.abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  cart_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  recovery_coupon_code text,
  admin_notes text,
  notified_at timestamp with time zone,
  recovered_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT abandoned_carts_status_check CHECK (status IN ('active', 'abandoned', 'recovered', 'expired'))
);

-- Enable RLS
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage abandoned carts"
  ON public.abandoned_carts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone can insert (for guest tracking via session_id)
CREATE POLICY "Anyone can insert abandoned carts"
  ON public.abandoned_carts FOR INSERT
  TO public
  WITH CHECK (true);

-- Users can view/update their own
CREATE POLICY "Users can view own abandoned carts"
  ON public.abandoned_carts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own abandoned carts"
  ON public.abandoned_carts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_abandoned_carts_status ON public.abandoned_carts(status);
CREATE INDEX idx_abandoned_carts_user_id ON public.abandoned_carts(user_id);
CREATE INDEX idx_abandoned_carts_session_id ON public.abandoned_carts(session_id);
CREATE INDEX idx_abandoned_carts_created_at ON public.abandoned_carts(created_at);

-- Auto-update updated_at
CREATE TRIGGER update_abandoned_carts_updated_at
  BEFORE UPDATE ON public.abandoned_carts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
