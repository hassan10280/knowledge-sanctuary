
CREATE OR REPLACE FUNCTION public.deduct_stock(p_book_id uuid, p_quantity integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.books
  SET stock_quantity = GREATEST(0, stock_quantity - p_quantity),
      in_stock = CASE WHEN (stock_quantity - p_quantity) > 0 THEN true ELSE false END,
      updated_at = now()
  WHERE id = p_book_id;
END;
$$;
