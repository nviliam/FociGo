-- ============================================================
-- FociGo — 007_short_tokens.sql
-- Rövid, felhasználóbarát tokenek a megosztható linkekhez
-- Futtatás: Supabase Dashboard → SQL Editor (006 után!)
--
-- Probléma: az invite_token és public_token UUID típusú,
-- ami spam-gyanús linkeket eredményez:
--   /join/550e8400-e29b-41d4-a716-446655440000
-- Megoldás: 8 karakter hosszú hex token:
--   /join/a3f9c821
-- ============================================================

-- ============================================================
-- 1. Token generáló segédfüggvény
-- md5(random UUID) → első 8 hex karakter
-- Pl: "a3f9c821", "d41d8cd9"
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_short_token()
RETURNS TEXT LANGUAGE sql AS $$
  SELECT substring(md5(gen_random_uuid()::text), 1, 8);
$$;

-- ============================================================
-- 2. groups tábla — short_invite_token oszlop
-- ============================================================
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS short_invite_token TEXT;

-- Meglévő sorok feltöltése
UPDATE public.groups
  SET short_invite_token = public.generate_short_token()
  WHERE short_invite_token IS NULL;

-- NOT NULL + DEFAULT a jövőbeli sorokhoz
ALTER TABLE public.groups
  ALTER COLUMN short_invite_token SET NOT NULL,
  ALTER COLUMN short_invite_token SET DEFAULT public.generate_short_token();

-- Unique index
CREATE UNIQUE INDEX IF NOT EXISTS groups_short_invite_token_idx
  ON public.groups(short_invite_token);

-- ============================================================
-- 3. matches tábla — short_public_token oszlop
-- ============================================================
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS short_public_token TEXT;

-- Meglévő sorok feltöltése
UPDATE public.matches
  SET short_public_token = public.generate_short_token()
  WHERE short_public_token IS NULL;

-- NOT NULL + DEFAULT
ALTER TABLE public.matches
  ALTER COLUMN short_public_token SET NOT NULL,
  ALTER COLUMN short_public_token SET DEFAULT public.generate_short_token();

-- Unique index
CREATE UNIQUE INDEX IF NOT EXISTS matches_short_public_token_idx
  ON public.matches(short_public_token);

-- ============================================================
-- 4. SECURITY DEFINER függvények frissítése TEXT típusra
--    A régi UUID-alapú függvények mellé/helyett ezek futnak.
-- ============================================================

-- Csoport lekérdezése rövid token alapján
CREATE OR REPLACE FUNCTION public.get_group_by_invite_token(p_token TEXT)
RETURNS TABLE(id UUID, name TEXT)
SECURITY DEFINER
LANGUAGE sql STABLE AS $$
  SELECT g.id, g.name
  FROM public.groups g
  WHERE g.short_invite_token = p_token
  LIMIT 1;
$$;

-- Csatlakozás csoporthoz rövid token alapján
CREATE OR REPLACE FUNCTION public.join_group_by_invite_token(p_token TEXT)
RETURNS TABLE(group_id UUID, already_member BOOLEAN)
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_group_id    UUID;
  v_is_member   BOOLEAN;
BEGIN
  SELECT g.id INTO v_group_id
  FROM public.groups g
  WHERE g.short_invite_token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Érvénytelen meghívó link';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = v_group_id
      AND gm.user_id  = auth.uid()
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    INSERT INTO public.group_members(group_id, user_id, is_admin)
    VALUES (v_group_id, auth.uid(), false);
  END IF;

  RETURN QUERY SELECT v_group_id, v_is_member;
END;
$$;
