
-- Ratings table: only purchasers can rate
CREATE TABLE IF NOT EXISTS public.book_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(book_id, user_id)
);

ALTER TABLE public.book_ratings ENABLE ROW LEVEL SECURITY;

-- Only users who purchased the book can insert a rating
CREATE POLICY "Purchasers can rate books" ON public.book_ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.book_id = book_ratings.book_id
        AND o.user_id = auth.uid()
        AND o.status != 'cancelled'
    )
  );

-- Anyone can read ratings
CREATE POLICY "Anyone can read ratings" ON public.book_ratings
  FOR SELECT TO public
  USING (true);

-- Users can update their own rating
CREATE POLICY "Users can update own rating" ON public.book_ratings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Add show_ratings toggle to books
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS show_ratings boolean DEFAULT true;
