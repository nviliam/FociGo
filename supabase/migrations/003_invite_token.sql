-- ============================================================
-- FociGo — 003_invite_token.sql
-- Meghívó token hozzáadása a groups táblához
-- Futtatás: Supabase Dashboard → SQL Editor (002 után!)
-- ============================================================

-- invite_token oszlop hozzáadása
-- DEFAULT gen_random_uuid() automatikusan generál tokent minden új csoporthoz
-- A régi csoportok is kapnak tokent a DEFAULT miatt
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS invite_token UUID DEFAULT gen_random_uuid() NOT NULL;

-- Unique index — garantálja, hogy két csoport nem kapja ugyanazt a tokent
CREATE UNIQUE INDEX IF NOT EXISTS groups_invite_token_idx
  ON public.groups(invite_token);

-- ============================================================
-- SECURITY DEFINER funkciók a join flow-hoz
--
-- Miért kell SECURITY DEFINER?
-- A csatlakozó user még NEM tagja a csoportnak, ezért az RLS
-- "groups: tag olvasás" policy nem engedi olvasni a group rekordot.
-- SECURITY DEFINER = a funkció az adatbázis owner jogaival fut,
-- megkerüli az RLS-t. Csak a szükséges adatokat adja vissza!
-- ============================================================

-- Csoport adatainak lekérdezése meghívó token alapján
-- Visszaad: id + name (semmi érzékeny adat nem kerül ki)
CREATE OR REPLACE FUNCTION public.get_group_by_invite_token(p_token UUID)
RETURNS TABLE(id UUID, name TEXT)
SECURITY DEFINER
LANGUAGE sql STABLE AS $$
  SELECT g.id, g.name
  FROM public.groups g
  WHERE g.invite_token = p_token
  LIMIT 1;
$$;

-- Csatlakozás csoporthoz meghívó token alapján
-- Visszaad: group_id + already_member (bool)
-- Ha már tag → nem hoz létre duplikátumot
CREATE OR REPLACE FUNCTION public.join_group_by_invite_token(p_token UUID)
RETURNS TABLE(group_id UUID, already_member BOOLEAN)
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_group_id    UUID;
  v_is_member   BOOLEAN;
BEGIN
  -- Token alapján megkeressük a csoportot
  SELECT g.id INTO v_group_id
  FROM public.groups g
  WHERE g.invite_token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Érvénytelen meghívó link';
  END IF;

  -- Ellenőrizzük, hogy már tag-e
  SELECT EXISTS(
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = v_group_id
      AND gm.user_id  = auth.uid()
  ) INTO v_is_member;

  -- Csak akkor adjuk hozzá, ha még nem tag
  IF NOT v_is_member THEN
    INSERT INTO public.group_members(group_id, user_id, is_admin)
    VALUES (v_group_id, auth.uid(), false);
  END IF;

  RETURN QUERY SELECT v_group_id, v_is_member;
END;
$$;
