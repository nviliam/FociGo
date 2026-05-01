-- ============================================================
-- FociGo — 004_transfer_admin.sql
-- Admin átruházás atomikus tranzakcióhoz SQL függvény
-- Futtatás: Supabase Dashboard → SQL Editor (003 után!)
-- ============================================================

-- Admin átruházás — két UPDATE egy tranzakcióban
--
-- Miért SECURITY DEFINER?
-- A Supabase JS kliens nem támogat natív tranzakciókat (BEGIN/COMMIT).
-- Ezért az atomicitást egy SECURITY DEFINER PL/pgSQL függvénnyel oldjuk meg,
-- amely adatbázis szinten fut egyetlen tranzakcióként.
--
-- Biztonsági megjegyzés: az alkalmazás kód a Server Action-ben ellenőrzi
-- az is_admin jogot — a függvény csak az atomikus írást végzi.

CREATE OR REPLACE FUNCTION public.transfer_group_admin(
  p_group_id    UUID,
  p_old_admin_id UUID,
  p_new_admin_id UUID
)
RETURNS VOID
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  -- Régi admin jogkörének elvétele
  UPDATE public.group_members
  SET is_admin = false
  WHERE group_id = p_group_id
    AND user_id  = p_old_admin_id;

  -- Új admin jogkörének megadása
  UPDATE public.group_members
  SET is_admin = true
  WHERE group_id = p_group_id
    AND user_id  = p_new_admin_id;

  -- Ha valamelyik UPDATE 0 sort érintett → hiba, teljes rollback
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Az admin átruházás sikertelen: a felhasználó nem tagja a csoportnak.';
  END IF;
END;
$$;
