-- ============================================================
-- FociGo — 006_guest_rsvps.sql
-- Vendég visszajelzések: bejelentkezés nélküli RSVP a nyilvános meccs-linken
-- Futtatás: Supabase Dashboard → SQL Editor (005 után!)
-- ============================================================

-- ============================================================
-- guest_rsvps tábla
-- Névvel (bejelentkezés nélkül) adott visszajelzések
-- ============================================================

CREATE TABLE IF NOT EXISTS public.guest_rsvps (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id    UUID        NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  guest_name  TEXT        NOT NULL CHECK (char_length(trim(guest_name)) BETWEEN 2 AND 40),
  status      rsvp_status NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT guest_rsvps_unique UNIQUE (match_id, guest_name)
);

COMMENT ON TABLE public.guest_rsvps IS 'Vendég visszajelzések — bejelentkezés nélkül, csak névvel, nyilvános meccs-linken';
COMMENT ON COLUMN public.guest_rsvps.guest_name IS 'A vendég megadott neve (2–40 karakter)';

CREATE INDEX idx_guest_rsvps_match_id ON public.guest_rsvps(match_id);

-- ============================================================
-- RLS policy-k
-- ============================================================

ALTER TABLE public.guest_rsvps ENABLE ROW LEVEL SECURITY;

-- Bárki olvashatja a vendég visszajelzéseket, ha ismeri a public_token-t
CREATE POLICY "guest_rsvps: nyilvános olvasás"
  ON public.guest_rsvps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = guest_rsvps.match_id
        AND m.public_token IS NOT NULL
    )
  );

-- Anonymous user is adhat vendég visszajelzést nyilvános meccsre,
-- ha az RSVP határidő még nem járt le
CREATE POLICY "guest_rsvps: vendég visszajelzés létrehozás"
  ON public.guest_rsvps
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = guest_rsvps.match_id
        AND m.public_token IS NOT NULL
        AND (m.rsvp_deadline IS NULL OR m.rsvp_deadline > NOW())
    )
  );

-- Meglévő vendég visszajelzés módosítása (upsert ON CONFLICT UPDATE ág)
CREATE POLICY "guest_rsvps: vendég visszajelzés módosítás"
  ON public.guest_rsvps
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = guest_rsvps.match_id
        AND m.public_token IS NOT NULL
        AND (m.rsvp_deadline IS NULL OR m.rsvp_deadline > NOW())
    )
  );

-- ============================================================
-- Jogosultságok
-- Az anon és authenticated szerepköröknek explicit GRANT szükséges,
-- mert a tábla SQL migrációval lett létrehozva (nem a Dashboard UI-n).
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON public.guest_rsvps TO anon;
GRANT SELECT, INSERT, UPDATE ON public.guest_rsvps TO authenticated;
