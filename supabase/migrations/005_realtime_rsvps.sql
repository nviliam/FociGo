-- Migration 005: Realtime engedélyezése az rsvps táblán
--
-- Miért kell ez?
-- A Supabase Realtime a PostgreSQL WAL (Write-Ahead Log) alapú
-- PUBLICATION mechanizmust használja. Csak azok a táblák kapnak
-- valós idejű eseményeket, amelyek fel vannak véve a
-- 'supabase_realtime' publikációba.
--
-- Alapesetben ez a publikáció üres — manuálisan kell felvenni
-- a táblákat. Ez a migráció az rsvps táblát adja hozzá,
-- hogy a kliensek Realtime subscription-ön keresztül
-- fogadhassák az RSVP változásokat.
--
-- Biztonság: A Realtime is tiszteli az RLS policy-kat!
-- A kliens csak azokat az eseményeket kapja meg, amelyekre
-- a SELECT policy engedélyt ad. Tehát egy csoport tagja
-- csak a saját csoportjához tartozó meccsek RSVP változásait látja.

ALTER PUBLICATION supabase_realtime ADD TABLE public.rsvps;
