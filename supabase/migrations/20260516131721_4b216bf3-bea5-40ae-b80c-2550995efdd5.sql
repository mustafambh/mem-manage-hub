
-- 1) Wipe existing data and users
DELETE FROM public.payments;
DELETE FROM public.subscriptions;
DELETE FROM public.members;
DELETE FROM public.packages;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;
DELETE FROM auth.users;

-- 2) Clubs table
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- 3) Add club_id to all relevant tables
ALTER TABLE public.profiles      ADD COLUMN club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles    ADD COLUMN club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE;
ALTER TABLE public.members       ADD COLUMN club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE;
ALTER TABLE public.packages      ADD COLUMN club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE;
ALTER TABLE public.subscriptions ADD COLUMN club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE;
ALTER TABLE public.payments      ADD COLUMN club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE;

CREATE INDEX idx_members_club       ON public.members(club_id);
CREATE INDEX idx_packages_club      ON public.packages(club_id);
CREATE INDEX idx_subscriptions_club ON public.subscriptions(club_id);
CREATE INDEX idx_payments_club      ON public.payments(club_id);
CREATE INDEX idx_user_roles_club    ON public.user_roles(club_id);
CREATE INDEX idx_profiles_club      ON public.profiles(club_id);

-- 4) Helper functions
CREATE OR REPLACE FUNCTION public.get_user_club_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT club_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- 5) Replace handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code TEXT;
  v_club_id UUID;
  v_count INT;
  v_role app_role;
BEGIN
  v_code := NEW.raw_user_meta_data->>'club_code';
  IF v_code IS NULL OR v_code = '' THEN
    RAISE EXCEPTION 'club_code is required';
  END IF;

  SELECT id INTO v_club_id FROM public.clubs WHERE code = v_code AND is_active = true;
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'Invalid club code: %', v_code;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, club_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, v_club_id);

  SELECT COUNT(*) INTO v_count FROM public.user_roles WHERE club_id = v_club_id;
  IF v_count = 0 THEN
    v_role := 'admin';
  ELSE
    v_role := 'staff';
  END IF;

  INSERT INTO public.user_roles (user_id, role, club_id) VALUES (NEW.id, v_role, v_club_id);
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6) Clubs RLS
CREATE POLICY "Users view own club" ON public.clubs
  FOR SELECT TO authenticated USING (id = public.get_user_club_id(auth.uid()));

-- 7) Rebuild RLS on existing tables to scope by club_id
-- profiles
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins delete profiles" ON public.profiles;

CREATE POLICY "View profiles in own club" ON public.profiles FOR SELECT TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Admins update club profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND club_id = public.get_user_club_id(auth.uid()));
CREATE POLICY "Admins delete club profiles" ON public.profiles FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND club_id = public.get_user_club_id(auth.uid()));

-- user_roles
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins view club roles" ON public.user_roles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') AND club_id = public.get_user_club_id(auth.uid()));
CREATE POLICY "Admins manage club roles" ON public.user_roles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') AND club_id = public.get_user_club_id(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'admin') AND club_id = public.get_user_club_id(auth.uid()));

-- members
DROP POLICY IF EXISTS "Staff view members" ON public.members;
DROP POLICY IF EXISTS "Staff insert members" ON public.members;
DROP POLICY IF EXISTS "Staff update members" ON public.members;
DROP POLICY IF EXISTS "Admins delete members" ON public.members;

CREATE POLICY "Staff view club members" ON public.members FOR SELECT TO authenticated
  USING (is_staff_or_admin(auth.uid()) AND club_id = public.get_user_club_id(auth.uid()));
CREATE POLICY "Staff insert club members" ON public.members FOR INSERT TO authenticated
  WITH CHECK (is_staff_or_admin(auth.uid()) AND club_id = public.get_user_club_id(auth.uid()));
CREATE POLICY "Staff update club members" ON public.members FOR UPDATE TO authenticated
  USING (is_staff_or_admin(auth.uid()) AND club_id = public.get_user_club_id(auth.uid()));
CREATE POLICY "Admins delete club members" ON public.members FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND club_id = public.get_user_club_id(auth.uid()));

-- packages
DROP POLICY IF EXISTS "Admins manage packages" ON public.packages;
DROP POLICY IF EXISTS "Staff view packages" ON public.packages;

CREATE POLICY "Staff view club packages" ON public.packages FOR SELECT TO authenticated
  USING (is_staff_or_admin(auth.uid()) AND club_id = public.get_user_club_id(auth.uid()));
CREATE POLICY "Admins manage club packages" ON public.packages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') AND club_id = public.get_user_club_id(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'admin') AND club_id = public.get_user_club_id(auth.uid()));

-- subscriptions
DROP POLICY IF EXISTS "Staff view subs" ON public.subscriptions;
DROP POLICY IF EXISTS "Staff insert subs" ON public.subscriptions;
DROP POLICY IF EXISTS "Staff update subs" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins delete subs" ON public.subscriptions;

CREATE POLICY "Staff view club subs" ON public.subscriptions FOR SELECT TO authenticated
  USING (is_staff_or_admin(auth.uid()) AND club_id = public.get_user_club_id(auth.uid()));
CREATE POLICY "Staff insert club subs" ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (is_staff_or_admin(auth.uid()) AND club_id = public.get_user_club_id(auth.uid()));
CREATE POLICY "Staff update club subs" ON public.subscriptions FOR UPDATE TO authenticated
  USING (is_staff_or_admin(auth.uid()) AND club_id = public.get_user_club_id(auth.uid()));
CREATE POLICY "Admins delete club subs" ON public.subscriptions FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND club_id = public.get_user_club_id(auth.uid()));

-- payments
DROP POLICY IF EXISTS "Staff view payments" ON public.payments;
DROP POLICY IF EXISTS "Staff insert payments" ON public.payments;
DROP POLICY IF EXISTS "Admins update payments" ON public.payments;
DROP POLICY IF EXISTS "Admins delete payments" ON public.payments;

CREATE POLICY "Staff view club payments" ON public.payments FOR SELECT TO authenticated
  USING (is_staff_or_admin(auth.uid()) AND club_id = public.get_user_club_id(auth.uid()));
CREATE POLICY "Staff insert club payments" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (is_staff_or_admin(auth.uid()) AND club_id = public.get_user_club_id(auth.uid()));
CREATE POLICY "Admins update club payments" ON public.payments FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND club_id = public.get_user_club_id(auth.uid()));
CREATE POLICY "Admins delete club payments" ON public.payments FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND club_id = public.get_user_club_id(auth.uid()));
