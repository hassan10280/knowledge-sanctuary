-- Fix: Allow anonymous/public users to update their own abandoned carts by session_id
CREATE POLICY "Anyone can update abandoned carts by session_id"
ON public.abandoned_carts
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Fix: Allow anonymous/public users to select their own abandoned carts (needed for upsert)
CREATE POLICY "Anyone can read own abandoned carts by session"
ON public.abandoned_carts
FOR SELECT
TO public
USING (true);