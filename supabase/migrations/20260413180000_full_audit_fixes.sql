-- PHASE 1: SECURITY FIXES

-- 1.1 Fix abandoned_carts public UPDATE policy
DROP POLICY IF EXISTS "Public can update abandoned carts by id" ON public.abandoned_carts;
CREATE POLICY "Session users can update own carts" ON public.abandoned_carts
  FOR UPDATE TO public
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (session_id IS NOT NULL AND session_id = coalesce(
      current_setting('request.headers', true)::json->>'x-session-id', ''
    ))
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (session_id IS NOT NULL AND session_id = coalesce(
      current_setting('request.headers', true)::json->>'x-session-id', ''
    ))
  );

-- 1.2 Fix coupons - restrict public SELECT to active only
DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.coupons;
CREATE POLICY "Public can read active coupons" ON public.coupons
  FOR SELECT TO public
  USING (
    is_active = true
    AND (expiry_date IS NULL OR expiry_date > now())
  );

-- 1.3 Restrict wholesale_discounts to wholesale/admin only
DROP POLICY IF EXISTS "Anyone can read wholesale discounts" ON public.wholesale_discounts;
CREATE POLICY "Wholesale or admin can read wholesale discounts" ON public.wholesale_discounts
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'wholesale') OR public.has_role(auth.uid(), 'admin')
  );

-- 1.3b Restrict wholesale_quantity_tiers to wholesale/admin only
DROP POLICY IF EXISTS "Anyone can read quantity tiers" ON public.wholesale_quantity_tiers;
CREATE POLICY "Wholesale or admin can read quantity tiers" ON public.wholesale_quantity_tiers
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'wholesale') OR public.has_role(auth.uid(), 'admin')
  );

-- 1.5 Fix audit_logs - remove overly permissive INSERT
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- PHASE 3: DATA INTEGRITY

-- 3.1 Add FK constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_user') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT fk_orders_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_order') THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT fk_order_items_order
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_book') THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT fk_order_items_book
      FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_billing_addresses_user') THEN
    ALTER TABLE public.billing_addresses
      ADD CONSTRAINT fk_billing_addresses_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_user') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT fk_profiles_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END$$;

-- 3.2 Atomic set_default_address function
CREATE OR REPLACE FUNCTION public.set_default_address(p_addr_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.billing_addresses
  SET is_default = false, updated_at = now()
  WHERE user_id = p_user_id AND is_default = true;

  UPDATE public.billing_addresses
  SET is_default = true, updated_at = now()
  WHERE id = p_addr_id AND user_id = p_user_id;
END;
$$;
