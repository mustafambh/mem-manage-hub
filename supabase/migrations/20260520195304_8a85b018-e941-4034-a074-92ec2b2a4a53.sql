
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS alert_days_before INT NOT NULL DEFAULT 7;

CREATE TABLE IF NOT EXISTS public.subscription_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  subscription_id UUID NOT NULL,
  member_id UUID NOT NULL,
  days_remaining INT NOT NULL,
  end_date DATE NOT NULL,
  note TEXT,
  notified_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_alerts_club ON public.subscription_alerts(club_id, created_at DESC);

ALTER TABLE public.subscription_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view club alerts" ON public.subscription_alerts
  FOR SELECT TO authenticated
  USING (is_staff_or_admin(auth.uid()) AND club_id = get_user_club_id(auth.uid()));

CREATE POLICY "Staff insert club alerts" ON public.subscription_alerts
  FOR INSERT TO authenticated
  WITH CHECK (is_staff_or_admin(auth.uid()) AND club_id = get_user_club_id(auth.uid()));

CREATE POLICY "Admins delete club alerts" ON public.subscription_alerts
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin') AND club_id = get_user_club_id(auth.uid()));

CREATE POLICY "Admins update club alert_days" ON public.clubs
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') AND id = get_user_club_id(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'admin') AND id = get_user_club_id(auth.uid()));
