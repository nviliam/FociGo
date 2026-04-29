-- ============================================================
-- FociGo — 002_rls_policies.sql
-- Row Level Security policy-k minden táblán
-- Futtatás: Supabase Dashboard → SQL Editor (001 után!)
-- ============================================================

-- ============================================================
-- RLS engedélyezése minden táblán
-- ============================================================

ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FÜGGVÉNY
-- Ellenőrzi, hogy az aktuális user tagja-e a csoportnak
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id  = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Ellenőrzi, hogy az aktuális user admin-e a csoportban
CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id  = auth.uid()
      AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- users POLICY-K
-- ============================================================

-- Saját profil megtekintése
CREATE POLICY "users: saját profil olvasás"
  ON public.users
  FOR SELECT
  USING (id = auth.uid());

-- Csoport tagok látják egymás profilját (nickname megjelenítéshez)
CREATE POLICY "users: csoporttárs profil olvasás"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.group_members gm1
      JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid()
        AND gm2.user_id = public.users.id
    )
  );

-- Saját profil módosítása (nickname beállítás)
CREATE POLICY "users: saját profil módosítás"
  ON public.users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Saját profil létrehozása (auth trigger meghívja)
CREATE POLICY "users: saját profil létrehozás"
  ON public.users
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================
-- groups POLICY-K
-- ============================================================

-- Saját csoportok megtekintése (amelynek tagja az user)
CREATE POLICY "groups: tag olvasás"
  ON public.groups
  FOR SELECT
  USING (public.is_group_member(id));

-- Bejelentkezett user létrehozhat csoportot
CREATE POLICY "groups: csoport létrehozás"
  ON public.groups
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Csak admin módosíthatja a csoport adatait
CREATE POLICY "groups: admin módosítás"
  ON public.groups
  FOR UPDATE
  USING (public.is_group_admin(id))
  WITH CHECK (public.is_group_admin(id));

-- Csak admin törölheti a csoportot
CREATE POLICY "groups: admin törlés"
  ON public.groups
  FOR DELETE
  USING (public.is_group_admin(id));

-- ============================================================
-- group_members POLICY-K
-- ============================================================

-- Saját csoport tagjainak megtekintése
CREATE POLICY "group_members: csoporttárs lista olvasás"
  ON public.group_members
  FOR SELECT
  USING (public.is_group_member(group_id));

-- Csoporthoz csatlakozás (bejelentkezett user saját tagságát hozza létre)
CREATE POLICY "group_members: csatlakozás"
  ON public.group_members
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Admin módosíthatja a tagságot (is_admin átruházás)
CREATE POLICY "group_members: admin módosítás"
  ON public.group_members
  FOR UPDATE
  USING (public.is_group_admin(group_id))
  WITH CHECK (public.is_group_admin(group_id));

-- Admin törölhet tagot; tag kiléphet maga
CREATE POLICY "group_members: admin törlés vagy saját kilépés"
  ON public.group_members
  FOR DELETE
  USING (
    public.is_group_admin(group_id)
    OR user_id = auth.uid()
  );

-- ============================================================
-- matches POLICY-K
-- ============================================================

-- Csoport tagok látják a meccseket
CREATE POLICY "matches: tag olvasás"
  ON public.matches
  FOR SELECT
  USING (public.is_group_member(group_id));

-- Nyilvános meccs-link: bárki olvashatja public_token alapján (auth nélkül is!)
CREATE POLICY "matches: nyilvános token olvasás"
  ON public.matches
  FOR SELECT
  USING (
    public_token IS NOT NULL
    -- Ez a policy anonymous és bejelentkezett usernek is érvényes
    -- A token ismerete jogosítja a read-only hozzáférésre
  );

-- Csak admin hozhat létre meccset a csoportban
CREATE POLICY "matches: admin létrehozás"
  ON public.matches
  FOR INSERT
  WITH CHECK (public.is_group_admin(group_id));

-- Csak admin módosíthatja a meccset
CREATE POLICY "matches: admin módosítás"
  ON public.matches
  FOR UPDATE
  USING (public.is_group_admin(group_id))
  WITH CHECK (public.is_group_admin(group_id));

-- Csak admin törölheti a meccset
CREATE POLICY "matches: admin törlés"
  ON public.matches
  FOR DELETE
  USING (public.is_group_admin(group_id));

-- ============================================================
-- rsvps POLICY-K
-- ============================================================

-- Csoport tagok látják az összes RSVP-t a meccsükön
CREATE POLICY "rsvps: csoporttárs RSVP olvasás"
  ON public.rsvps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = rsvps.match_id
        AND public.is_group_member(m.group_id)
    )
  );

-- Nyilvános meccs-link: RSVP-k is olvashatók token ismeretével
CREATE POLICY "rsvps: nyilvános token RSVP olvasás"
  ON public.rsvps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = rsvps.match_id
        AND m.public_token IS NOT NULL
    )
  );

-- Bejelentkezett tag létrehozhatja saját RSVP-jét
CREATE POLICY "rsvps: saját RSVP létrehozás"
  ON public.rsvps
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = rsvps.match_id
        AND public.is_group_member(m.group_id)
        -- RSVP-határidő ellenőrzés: csak határidő előtt lehet visszajelzést adni
        AND (m.rsvp_deadline IS NULL OR m.rsvp_deadline > NOW())
    )
  );

-- Saját RSVP módosítása (határidő előtt)
CREATE POLICY "rsvps: saját RSVP módosítás"
  ON public.rsvps
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = rsvps.match_id
        AND (m.rsvp_deadline IS NULL OR m.rsvp_deadline > NOW())
    )
  );

-- Saját RSVP törlése (határidő előtt)
CREATE POLICY "rsvps: saját RSVP törlés"
  ON public.rsvps
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = rsvps.match_id
        AND (m.rsvp_deadline IS NULL OR m.rsvp_deadline > NOW())
    )
  );
