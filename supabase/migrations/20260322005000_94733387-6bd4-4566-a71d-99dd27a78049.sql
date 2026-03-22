
CREATE TABLE IF NOT EXISTS public.coupon_user_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coupon_id, user_id)
);

ALTER TABLE public.coupon_user_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coupon usage"
  ON public.coupon_user_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coupon usage"
  ON public.coupon_user_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage coupon usage"
  ON public.coupon_user_usage FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS orders_transaction_id_unique 
  ON public.orders (transaction_id) 
  WHERE transaction_id IS NOT NULL;

ALTER TABLE public.orders ADD CONSTRAINT orders_total_non_negative CHECK (total >= 0);

CREATE OR REPLACE FUNCTION public.validate_order_transaction_id()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $$
BEGIN
  IF NEW.transaction_id IS NOT NULL AND (
    length(NEW.transaction_id) < 4 OR length(NEW.transaction_id) > 50
  ) THEN
    RAISE EXCEPTION 'transaction_id must be between 4 and 50 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_order_transaction_id
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_transaction_id();
