# FociGo — Teljes technikai leírás (interjú-felkészítés)

---

## 1. Mi az app és mi a célja?

A FociGo egy full-stack webalkalmazás amatőr focicsoportok szervezéséhez. A felhasználók csoportokat hozhatnak létre, meccseket szervezhetnek, RSVP-vel visszajelezhetnek, és meghívólinken keresztül másokat is becsalhatnak a csoportba. Bejelentkezés nélküli (vendég) visszajelzés is lehetséges a nyilvános meccslinken.

---

## 2. Tech stack

| Réteg | Technológia |
|---|---|
| Frontend framework | Next.js 15 (App Router) |
| UI | React + Tailwind CSS |
| Backend/DB | Supabase (Postgres, Auth, Realtime) |
| Adatbiztonság | Row Level Security (RLS) |
| Hitelesítés | Google OAuth + Email OTP (magic code) |
| Típusok | TypeScript végig |
| Validáció | Zod |
| Deployment | Vercel (NEXT_PUBLIC_APP_URL / VERCEL_URL) |

---

## 3. Adatbázis séma (Postgres)

### Táblák és kapcsolataik

```
auth.users (Supabase belső)
    │
    └── public.users (id FK → auth.users)
            │ nickname, email
            │
            ├── group_members (user_id FK → users, group_id FK → groups)
            │       is_admin: BOOLEAN
            │       UNIQUE(group_id, user_id)  ← egy user egyszer tagja egy csoportnak
            │
            └── rsvps (user_id FK → users, match_id FK → matches)
                    status: ENUM('going', 'not_going')
                    UNIQUE(match_id, user_id)  ← egy user egyszer jelezhet vissza

public.groups
    │ name, default_venue, default_schedule, default_venue_fee
    │ invite_token (UUID), short_invite_token (8 char hex)
    │
    └── matches (group_id FK → groups)
            venue, match_date, venue_fee, rsvp_deadline
            public_token (UUID), short_public_token (8 char hex)
            │
            ├── rsvps (match_id FK → matches)
            └── guest_rsvps (match_id FK → matches)
                    guest_name TEXT, status ENUM
                    UNIQUE(match_id, guest_name)
```

### Fontos design döntések

**Pénz egész számban (fillér):** A `venue_fee` sohasem float — egész szám (pl. 2500 = 2500 Ft). Lebegőpontos kerekítési hibák elkerülése végett.

**Két token minden csoporthoz/meccshez:**
- UUID token (belső, eredeti) — `/join/550e8400-e29b-...`
- Rövid token (8 hex karakter, `md5(gen_random_uuid())` első 8 karaktere) — `/join/a3f9c821`

A rövid token olvashatóbb, spam-gyanúsabb linkek helyett barátságos URL-t ad. (Migration 007)

**`updated_at` trigger:** Minden `UPDATE`-nél automatikusan frissül `NOW()`-ra, PL/pgSQL trigger-rel — nem az alkalmazás kód felelős érte.

**`auth.users` → `public.users` sync:** Supabase Auth trigger automatikusan létrehoz egy `public.users` sort, amikor az OAuth/OTP belépés megtörténik.

---

## 4. Row Level Security (RLS) — a biztonsági réteg

Az RLS az adatbázis szintjén érvényesíti, hogy ki mit láthat és módosíthat. Ez azt jelenti: **még ha egy bug is van az alkalmazás kódban, az adatok nem szivárognak ki** — mert a DB maga tagadja meg a hozzáférést.

### Két helper függvény (SECURITY DEFINER)

```sql
is_group_member(p_group_id UUID) → BOOLEAN
is_group_admin(p_group_id UUID) → BOOLEAN
```

Ezekre hivatkoznak a policy-k, így nem kell minden policy-ban ismételni a JOIN-t.

### Főbb policy-k logikája

| Tábla | Kik láthatják? | Kik módosíthatják? |
|---|---|---|
| `users` | Saját profil + csoporttársak (nickname-hez) | Csak saját profil |
| `groups` | Csak tagok | Csak admin |
| `group_members` | Csak csoporttagok | Admin (is_admin toggle), tag maga kiléphet |
| `matches` | Tagok + **bárki public_token alapján** | Csak admin |
| `rsvps` | Tagok (saját csoport meccsein) + maga az érintett | Tag saját RSVP-jét |
| `guest_rsvps` | Bárki, ha ismeri a public_token-t | Bárki (deadline előtt) |

### Különleges eset: nyilvános meccs policy

```sql
CREATE POLICY "matches: nyilvános token olvasás"
  ON public.matches FOR SELECT
  USING (public_token IS NOT NULL);
```

Ez azt jelenti: ha valaki ismeri a `public_token`-t (mert kapott linket), akkor `anon` Supabase kulccsal is le tudja kérdezni a meccset — bejelentkezés nélkül. Ez **szándékos design döntés**, a nyilvános megoszthatóság érdekében.

---

## 5. Autentikáció

Két módszer van, mindkettő Supabase Auth-on alapul:

### Google OAuth (PKCE flow)

1. `signInWithGoogle()` Server Action → `supabase.auth.signInWithOAuth()` → redirect Google-re
2. Google visszairányít `/auth/callback?code=...`-re
3. A callback route `exchangeCodeForSession(code)` → session cookie
4. Nickname ellenőrzés → ha nincs, `/setup`; ha van, `/groups`

### Email OTP (6-jegyű kód)

1. `signInWithMagicLink()` → `supabase.auth.signInWithOtp()` — **nem** magic link, hanem 6-jegyű kód kerül az emailbe
2. Miért kód és nem link? Mert a PKCE-alapú magic link böngésző-függő — ha más eszközön nyitja meg a user, nem működik. A 6-jegyű kód eszközfüggetlen.
3. `/login/check-email` oldal → user beírja a kódot
4. `verifyOtpCode()` Server Action → `supabase.auth.verifyOtp()` → session

### Open redirect védelem

Minden `next` paraméter (visszairányítás login után) validálva van:

```typescript
const safeNext = next.startsWith("/join/") || next.startsWith("/groups/") ? next : "";
```

Külső URL-re nem lehet átirányítani — ez egy OWASP Top 10 biztonsági szempont (A01 - Broken Access Control).

### Middleware (session guard)

A `middleware.ts` minden kérésnél fut (Next.js Edge Runtime):

1. Frissíti a Supabase session cookie-t
2. Ha védett route és nincs user → `/login`
3. Ha be van jelentkezve és `/login`-ra megy → `/groups`
4. Ha be van jelentkezve de nincs nickname → `/setup`
5. `has_profile` cookie cache-eli a nickname-ellenőrzést 7 napra — így nem kell minden kérésnél DB-t hívni

---

## 6. Server Actions — az API réteg

A Next.js App Router Server Action-öket használ API route-ok helyett. Ezek szerveren futó async függvények, amelyeket közvetlenül lehet meghívni React komponensekből.

### Fontos pattern: UUID előre generálás (PostgreSQL 15 RLS csapda)

```typescript
const groupId = randomUUID();
await supabase.from("groups").insert({ id: groupId, ...data });
// NINCS .select() az insert után!
```

**Miért?** PG15-ben az `INSERT ... RETURNING` a `SELECT` policy-t is lefuttatja az új soron. A `groups` SELECT policy `is_group_member(id)`-t ellenőriz — de a `group_members` sor még nem létezik (épp most lett volna létrehozva a következő lépésben). Tehát **RLS violation hibát kapnánk**, ha `.select()`-et hívnánk az insert után. Az UUID előzetes generálásával elkerüljük ezt.

### Csoport létrehozás flow

1. Zod validáció
2. UUID előre generálás
3. `groups` INSERT (nincs `.select()`)
4. `group_members` INSERT (az UUID-t már ismerjük)
5. `revalidatePath("/groups")` → Next.js cache invalidálás
6. `redirect()` az új csoport oldalára

### Admin átruházás — atomikus tranzakció

A Supabase JS kliens **nem támogat natív tranzakciót**. Az atomicitást egy `SECURITY DEFINER` PL/pgSQL függvénnyel oldja meg:

```sql
CREATE OR REPLACE FUNCTION public.transfer_group_admin(
  p_group_id UUID, p_old_admin_id UUID, p_new_admin_id UUID
) RETURNS VOID SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE group_members SET is_admin = false WHERE ...;
  UPDATE group_members SET is_admin = true  WHERE ...;
  IF NOT FOUND THEN RAISE EXCEPTION '...'; END IF;
END; $$;
```

Az alkalmazás `supabase.rpc("transfer_group_admin", {...})` hívással éri el. Ha bármelyik UPDATE hibát ad, **teljes rollback** — sosem marad a csoport admin nélkül.

### RSVP UPSERT logika

```typescript
await supabase.from("rsvps").upsert(
  { id, match_id: matchId, user_id: user.id, status },
  { onConflict: "match_id,user_id" }
);
```

Az `UNIQUE(match_id, user_id)` constraint miatt egy user csak egy aktív RSVP-t tarthat meccsenkénta — ha már van és módosítani akarja, az `INSERT ON CONFLICT DO UPDATE` automatikusan frissíti. Nem kell előbb SELECT-tel ellenőrizni, hogy létezik-e már.

**Toggle viselkedés:** Ha a user ugyanarra a gombra kattint, amire már kattintott → `deleteRsvp()` fut, nem upsert. Ez "visszavonás" funkcionalitás.

---

## 7. Csatlakozás meghívólinken — SECURITY DEFINER RPC-k

A `/join/[token]` oldal egy problémát old meg: a csatlakozó user **még nem tagja** a csoportnak, tehát az RLS policy (`is_group_member`) nem engedné olvasni a csoport adatait.

Megoldás: két `SECURITY DEFINER` SQL függvény, amelyek az adatbázis owner jogaival futnak, megkerülve az RLS-t — de csak a szükséges adatokat adják vissza:

```sql
get_group_by_invite_token(p_token TEXT) → (id UUID, name TEXT)
join_group_by_invite_token(p_token TEXT) → (group_id UUID, already_member BOOLEAN)
```

A `join_group_by_invite_token` idempotens: ha a user már tag, nem hoz létre duplikátumot, hanem visszaadja az `already_member = true` értéket.

---

## 8. Realtime RSVP frissítések

A meccs detail oldalon az RSVP lista valós időben frissül, oldal-újratöltés nélkül.

### Hogyan működik?

1. A Supabase Realtime a PostgreSQL WAL (Write-Ahead Log) alapján figyeli a táblaváltozásokat.
2. Migration 005 felveszi az `rsvps` táblát a `supabase_realtime` publikációba:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE public.rsvps;
   ```
3. Az `RsvpList` Client Component WebSocket kapcsolatot nyit:
   ```typescript
   supabase.channel(`rsvps-match-${matchId}`)
     .on("postgres_changes", {
       event: "*", table: "rsvps", filter: `match_id=eq.${matchId}`
     }, callback)
     .subscribe();
   ```
4. Bármely tag INSERT/UPDATE/DELETE-et végez → a payload megérkezik, a `useState` frissül.

**Fontos:** A Realtime **is tiszteli az RLS policy-kat** — a kliens csak azokat az eseményeket kapja, amelyekre a SELECT policy engedélyt ad.

**`createBrowserClient` vs `createClient`:** A `server.ts`-beli `createClient` Next.js `cookies()` API-t használ (csak szerveren fut). A Realtime-hoz `createBrowserClient` kell, mert az a böngésző localStorage/cookie-ból olvassa a session tokent.

---

## 9. Nyilvános meccs oldal (`/match/[token]`)

Ez az útvonal az `(app)` route csoporton **kívül** van — szándékosan, mert bejelentkezés nélkül is elérhetőnek kell lennie. A middleware `PUBLIC_ROUTES` tömbje tartalmazza a `/match` prefixet.

### Vendég visszajelzés (`guest_rsvps` tábla)

- Névvel (2–40 karakter), bejelentkezés nélkül
- RSVP deadline után az RLS INSERT policy blokkolja az új visszajelzéseket
- `UNIQUE(match_id, guest_name)` → upsert: ugyanolyan névvel módosítható a státusz
- `anon` és `authenticated` szerepkörnek explicit `GRANT` szükséges (mert SQL migrációval lett létrehozva, nem a Supabase Dashboard UI-n)

### OpenGraph meta tag generálás

`generateMetadata()` dinamikusan generál OG title/description-t, így WhatsApp/Telegram előnézet is jól néz ki megosztáskor.

---

## 10. Route struktúra és Next.js App Router logika

```
/                                              → landing
/(auth)/login                                  → bejelentkezés (public)
/auth/callback                                 → OAuth/OTP callback (public)
/join/[token]                                  → meghívólink (public)
/match/[token]                                 → nyilvános meccs (public)
/(app)/setup                                   → nickname setup (auth szükséges)
/(app)/groups                                  → csoportlista
/(app)/groups/[id]                             → csoport detail
/(app)/groups/[id]/matches/new                 → meccs létrehozás
/(app)/groups/[id]/matches/[matchId]           → meccs detail + RSVP
/(app)/groups/[id]/matches/[matchId]/edit      → meccs szerkesztés
```

Az `(app)` és `(auth)` route csoportok **csak szervezési célúak** — nem jelennek meg az URL-ben.

Minden `loading.tsx` file egy **Suspense boundary**-t hoz létre: amíg az oldal adatai töltődnek, a loading skeleton jelenik meg.

---

## 11. Optimista UI (RsvpButtons)

```typescript
const previousStatus = status;
setStatus(clicked); // azonnal frissül a UI — nem vár a szerverre
startTransition(async () => {
  const result = await upsertRsvp(...);
  if (result?.error) setStatus(previousStatus); // rollback hibánál
});
```

A `useTransition` a Server Action hívást "átmeneti" állapotba teszi: az `isPending` flag `true` amíg a szerver válaszol — a gombok disabled és spinner jelenik meg. Az UI azonnal reagál a kattintásra (nem vár 200–500ms-t a szerver válaszra), de ha hiba van, visszaáll.

---

## 12. Validáció — Zod

Minden Server Action bemenete Zod schema-val validálva van, mielőtt az adatbázishoz nyúlna:

```typescript
const CreateGroupSchema = z.object({
  name: z.string().min(2).max(50),
  default_venue: z.string().optional(),
  // ...
});
```

Ez megakadályozza, hogy érvénytelen adatok kerüljenek a DB-be, és strukturált hibaüzeneteket ad vissza.

---

## 13. Biztonsági szempontok (összefoglaló)

| Szempont | Megoldás |
|---|---|
| Open redirect | `safeNext` — csak `/join/` és `/groups/` prefix engedélyezett |
| Jogosulatlan admin műveletek | Szerver oldalon is ellenőrzött (`is_admin` check minden admin action-ben) — nem csak UI-ban elrejtve |
| SQL injection | Supabase SDK (paraméteres lekérdezések automatikusan) |
| CSRF | Next.js Server Actions beépített CSRF védelem |
| Adat-szivárgás | RLS — DB szinten érvényesített, nem csak alkalmazás logikán |
| Atomicitás (admin átruházás) | SECURITY DEFINER PL/pgSQL függvény = DB tranzakció |
| Guest RSVP visszaélés | RSVP deadline RLS policy tiltja az INSERT-et lejárat után |

---

## 14. Várható interjúkérdések és válaszok

**"Miért SECURITY DEFINER a join flow-ban?"**
Mert a csatlakozó user még nem tagja a csoportnak, az RLS nem engedné olvasni a csoport adatait. A SECURITY DEFINER függvény az owner jogaival fut, megkerüli az RLS-t — de csak a minimum szükséges adatot (id, name) adja vissza, nem az egész sort.

**"Miért nem használsz API route-okat?"**
Server Actions-ök elégségesek — szerveren futnak, hozzáférnek a session cookie-hoz, Zod validációval és RLS-sel biztonságosak. Kevesebb boilerplate, mint külön API route-ok.

**"Mi a különbség a Server Component és Client Component között?"**
Server Component szerveren renderelődik, hozzáfér a DB-hez/sessionhöz, de nincs interaktivitás. Client Component böngészőben fut, van `useState`/`useEffect`, de kezdeti adatot `props`-ban kap a szerver komponenstől. A Realtime-hoz és optimista UI-hoz Client Component szükséges.

**"Hogyan oldottad meg a pénzszámítást?"**
Egész számban tárolom (fillér). A fejenkénti ár `Math.ceil(venue_fee / goingCount)` — felfelé kerekítve, hogy ne maradjon kifizetetlen összeg.

**"Miért van két token (UUID + short)?"**
Az UUID spam-gyanús linkeket ad (`/join/550e8400-e29b-41d4-a716-446655440000`). A 8 karakteres hex token (`/join/a3f9c821`) barátságosabb, megoszthatóbb, de ütközési valószínűsége elhanyagolható (16^8 = ~4 milliárd lehetséges érték, ráadásul UNIQUE index véd).

**"Mi a PG15 RLS csapda az INSERT + RETURNING esetén?"**
PG15-ben az INSERT ... RETURNING záradék a SELECT policy-t is lefuttatja az új soron. Ha a SELECT policy a tagságot ellenőrzi (is_group_member), de a group_members sor még nem létezik az insert pillanatában, RLS violation hibát kapunk. Megoldás: UUID-t előre generálunk a Node.js oldalon, így nincs szükség RETURNING-re.

**"Miért Realtime és nem polling?"**
A Realtime WebSocket-alapú — a szerver push-olja a változásokat, nem kell a kliensnek ismételten kérdezni. Kevesebb hálózati forgalom, azonnali frissítés.

**"Hogyan biztonságos a vendég RSVP?"**
Az RLS INSERT policy ellenőrzi, hogy a meccs `rsvp_deadline`-ja nem járt-e le. A vendég névvel (nem azonosítóval) jelzi vissza — ütközés esetén az upsert frissíti a meglévő sort. A `UNIQUE(match_id, guest_name)` megakadályozza a duplikátumokat.
