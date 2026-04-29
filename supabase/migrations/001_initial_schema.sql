-- ============================================================
-- FociGo — 001_initial_schema.sql
-- Alap adatbázis séma: táblák, típusok, indexek
-- Futtatás: Supabase Dashboard → SQL Editor
-- ============================================================

-- UUID generálás engedélyezése (Supabase-ben alapból elérhető)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM típusok
-- ============================================================

CREATE TYPE rsvp_status AS ENUM ('going', 'not_going');

-- ============================================================
-- users tábla
-- Kiegészíti a Supabase auth.users táblát (nickname, stb.)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  nickname    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'Kiegészítő felhasználói adatok (nickname) — auth.users alapján';
COMMENT ON COLUMN public.users.nickname IS 'A felhasználó megjelenő neve a csoportokban (2–30 karakter)';

-- ============================================================
-- groups tábla
-- Focis csoport default beállításokkal
-- ============================================================

CREATE TABLE IF NOT EXISTS public.groups (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT        NOT NULL,
  default_venue       TEXT,
  default_schedule    TEXT,
  default_venue_fee   INTEGER,    -- fillérben (pl. 2500 = 2500 Ft)
  invite_token        UUID        NOT NULL DEFAULT uuid_generate_v4(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.groups IS 'Focis csoportok csoport-szintű default beállításokkal';
COMMENT ON COLUMN public.groups.default_venue_fee IS 'Terembérlési díj fillérben — egész szám, soha nem float';
COMMENT ON COLUMN public.groups.invite_token IS 'Egyedi meghívó token — /join/[invite_token] URL-ben';

CREATE UNIQUE INDEX idx_groups_invite_token ON public.groups(invite_token);

-- ============================================================
-- group_members tábla
-- Felhasználó ↔ Csoport kapcsolat + admin jogkör
-- ============================================================

CREATE TABLE IF NOT EXISTS public.group_members (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_admin    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT group_members_unique UNIQUE (group_id, user_id)
);

COMMENT ON TABLE public.group_members IS 'Csoport tagság — egy user egy csoportban csak egyszer szerepelhet';
COMMENT ON COLUMN public.group_members.is_admin IS 'TRUE = admin jogkör, FALSE = tag';

CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id  ON public.group_members(user_id);

-- ============================================================
-- matches tábla
-- Meccsek csoport-szintű kezeléssel + megosztható token
-- ============================================================

CREATE TABLE IF NOT EXISTS public.matches (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id        UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  venue           TEXT        NOT NULL,
  match_date      TIMESTAMPTZ NOT NULL,
  venue_fee       INTEGER     NOT NULL,  -- fillérben
  rsvp_deadline   TIMESTAMPTZ,
  public_token    UUID        NOT NULL DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.matches IS 'Meccsek — minden meccs egy csoporthoz tartozik';
COMMENT ON COLUMN public.matches.venue_fee IS 'Terembérlési díj fillérben — egész szám';
COMMENT ON COLUMN public.matches.rsvp_deadline IS 'RSVP visszavonási határidő — utána az ár rögzül';
COMMENT ON COLUMN public.matches.public_token IS 'Nyilvánosan megosztható egyedi token — /match/[token]';

CREATE UNIQUE INDEX idx_matches_public_token ON public.matches(public_token);
CREATE INDEX idx_matches_group_id           ON public.matches(group_id);
CREATE INDEX idx_matches_match_date         ON public.matches(match_date);

-- ============================================================
-- rsvps tábla
-- Visszajelzések meccsenkénti kezeléssel
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rsvps (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id    UUID        NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  status      rsvp_status NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT rsvps_unique UNIQUE (match_id, user_id)
);

COMMENT ON TABLE public.rsvps IS 'RSVP visszajelzések — egy user egy meccsre csak egyszer jelezhet vissza';
COMMENT ON COLUMN public.rsvps.status IS 'going = Jövök | not_going = Nem jövök';

CREATE INDEX idx_rsvps_match_id ON public.rsvps(match_id);
CREATE INDEX idx_rsvps_user_id  ON public.rsvps(user_id);

-- ============================================================
-- updated_at automatikus frissítése trigger-rel
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_rsvps_updated_at
  BEFORE UPDATE ON public.rsvps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Supabase Auth trigger: auth.users → public.users sync
-- Új auth user regisztrációkor automatikusan létrehoz public.users sort
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
