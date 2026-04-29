-- ============================================================
-- FociGo — seed.sql
-- Fejlesztői tesztadatok
-- FIGYELEM: Csak fejlesztői/tesztelési környezetben futtatandó!
-- Futtatás: Supabase Dashboard → SQL Editor (001 + 002 után!)
-- ============================================================

-- ============================================================
-- Megjegyzés: A users táblába adatokat az auth.users trigger hoz létre.
-- Fejlesztéshez a Supabase Dashboard Authentication menüjében
-- hozd létre a teszt felhasználókat, majd a user ID-kat másold be ide.
--
-- Helyőrző UUID-k — cseréld le a valódi auth user ID-kra:
--   ADMIN_USER_ID  = az admin felhasználó UUID-ja
--   MEMBER_USER_ID = a tag felhasználó UUID-ja
-- ============================================================

-- Nickname beállítása a teszt usereknek (ha már léteznek auth.users-ben)
-- UPDATE public.users SET nickname = 'Viliam' WHERE id = '<ADMIN_USER_ID>';
-- UPDATE public.users SET nickname = 'Tesztjáték' WHERE id = '<MEMBER_USER_ID>';

-- ============================================================
-- Minta csoport
-- ============================================================

INSERT INTO public.groups (id, name, default_venue, default_schedule, default_venue_fee, invite_token)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Kedd esti focisok',
  'Sportpálya Bp. XI. ker.',
  'Minden kedd 20:00',
  6000,  -- 6000 Ft terembérlés
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Minta meccs
-- ============================================================

INSERT INTO public.matches (id, group_id, venue, match_date, venue_fee, rsvp_deadline, public_token)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Sportpálya Bp. XI. ker.',
  NOW() + INTERVAL '7 days',  -- egy hét múlva
  6000,
  NOW() + INTERVAL '5 days',  -- RSVP-határidő: 5 nap múlva
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Megjegyzés a group_members és rsvps adatokhoz
-- ============================================================
-- A group_members és rsvps rekordokat az alkalmazáslogika hozza létre
-- (Server Actions: createGroup automatikusan felveszi az adminisztrátor tagságát,
--  setRsvp kezeli az RSVP létrehozást/módosítást).
--
-- Kézzel is hozzáadhatsz teszteléshez, ha megvannak a user ID-k:
--
-- INSERT INTO public.group_members (group_id, user_id, is_admin) VALUES
--   ('11111111-1111-1111-1111-111111111111', '<ADMIN_USER_ID>',  TRUE),
--   ('11111111-1111-1111-1111-111111111111', '<MEMBER_USER_ID>', FALSE)
-- ON CONFLICT (group_id, user_id) DO NOTHING;
--
-- INSERT INTO public.rsvps (match_id, user_id, status) VALUES
--   ('22222222-2222-2222-2222-222222222222', '<ADMIN_USER_ID>',  'going'),
--   ('22222222-2222-2222-2222-222222222222', '<MEMBER_USER_ID>', 'not_going')
-- ON CONFLICT (match_id, user_id) DO NOTHING;
