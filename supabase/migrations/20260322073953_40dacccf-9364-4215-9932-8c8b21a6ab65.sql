
-- Analytics events table
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  user_id uuid NULL,
  session_id text NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX idx_analytics_events_name ON public.analytics_events (event_name);
CREATE INDEX idx_analytics_events_created ON public.analytics_events (created_at DESC);
CREATE INDEX idx_analytics_events_user ON public.analytics_events (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_analytics_events_session ON public.analytics_events (session_id) WHERE session_id IS NOT NULL;

-- RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (guests too)
CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events FOR INSERT TO public
WITH CHECK (true);

-- Only admins can read analytics
CREATE POLICY "Admins can read analytics"
ON public.analytics_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete analytics
CREATE POLICY "Admins can delete analytics"
ON public.analytics_events FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
