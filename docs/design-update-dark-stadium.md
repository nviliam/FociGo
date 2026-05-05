# FociGo — Dark Stadium UI Redesign

## Összefoglalás

Az eredeti világos Next.js alapdesign helyett egy teljesen egyedi, sötét, futurisztikus, focitémájú dizájnt vezettünk be.

---

## Design rendszer (`globals.css`)

### Színpaletta

| Token              | Érték                  | Szerep                               |
| ------------------ | ---------------------- | ------------------------------------ |
| `--bg-base`        | `#060a12`              | Fő háttér (majdnem fekete)           |
| `--bg-surface`     | `#0c1220`              | Emelt felület                        |
| `--bg-card`        | `#111827`              | Kártyák háttere                      |
| `--bg-card-hover`  | `#162035`              | Kártya hover állapot                 |
| `--accent`         | `#00e676`              | Elektromos zöld — elsődleges kiemelő |
| `--accent-dim`     | `#00c45a`              | Halványabb accent (gombhover)        |
| `--accent-glow`    | `rgba(0,230,118,0.15)` | Neon glow effekt                     |
| `--text-primary`   | `#f0f4ff`              | Fő szöveg                            |
| `--text-secondary` | `#8892a4`              | Másodlagos szöveg                    |
| `--going-text`     | `#00e676`              | "Megyek" státusz                     |
| `--notgoing-text`  | `#ff6b6b`              | "Nem megyek" státusz                 |

### Tipográfia

- **Font**: [Michroma](https://fonts.google.com/specimen/Michroma) — minden szövegre alkalmazva
- Betöltés: CSS `@import url('https://fonts.googleapis.com/css2?family=Michroma&display=swap')` a `globals.css` legelején
- `body` és `.logo-text` egyaránt `font-family: "Michroma", sans-serif`

> ⚠️ A Michroma **nem érhető el** a `next/font/google` csomagban (Next.js 16.2.4), ezért CSS @import-ot használunk.

### Utility osztályok

| Osztály           | Leírás                                         |
| ----------------- | ---------------------------------------------- |
| `.btn-primary`    | Tömör accent zöld gomb, hover glow             |
| `.btn-secondary`  | Átlátszó, zöld keretű gomb                     |
| `.input-field`    | Sötét háttérű, zöld fókusz input               |
| `.label`          | Halványszürke form label                       |
| `.badge-going`    | Zöld "Megyek" badge                            |
| `.badge-notgoing` | Piros "Nem megyek" badge                       |
| `.card`           | Sötét kártya, border, hover glow               |
| `.card-link`      | Kattintható kártya (hover CSS-sel, nem JS-sel) |
| `.logo-text`      | Michroma font, letter-spacing                  |

---

## Módosított fájlok

### Alap infrastruktúra

- `src/app/globals.css` — teljes újraírás: CSS custom properties, utility osztályok, Michroma font import
- `src/app/layout.tsx` — Geist font megtartva (CSS változóként), Michroma CSS-ből töltve

### Layout & navigáció

- `src/app/(app)/layout.tsx` — dark wrapper, `min-h-screen bg-[var(--bg-base)]`
- `src/components/layout/navbar.tsx` — glassmorphism sticky header, accent logó

### Auth oldalak

- `src/app/(auth)/login/page.tsx` — centered dark kártya, `.logo-text` cím
- `src/app/(auth)/login/check-email/page.tsx` — dark centered üzenet

### App oldalak

- `src/app/(app)/setup/page.tsx` — dark onboarding form
- `src/app/(app)/groups/page.tsx` — csoportlista, `.card-link` hover
- `src/app/(app)/groups/new/page.tsx` — dark form
- `src/app/(app)/groups/[id]/page.tsx` — csoport részletek, dark szekciók
- `src/app/(app)/groups/[id]/matches/new/page.tsx` — meccs létrehozás form
- `src/app/(app)/groups/[id]/matches/[matchId]/page.tsx` — meccs részletek, dark adattábla
- `src/app/(app)/groups/[id]/matches/[matchId]/edit/page.tsx` — meccs szerkesztés form

### Publikus oldalak

- `src/app/join/[token]/page.tsx` — meghívó oldal, dark kártya
- `src/app/match/[token]/page.tsx` — publikus meccs oldal, dark layout

### Komponensek

- `src/components/features/create-group-form.tsx` — `.input-field`, `.label`, `.btn-primary`
- `src/components/features/create-match-form.tsx` — ugyanaz
- `src/components/features/edit-match-form.tsx` — ugyanaz
- `src/components/features/rsvp-buttons.tsx` — neon going/notgoing gombok
- `src/components/features/rsvp-list.tsx` — dark lista, accent összesítő sor
- `src/components/features/invite-link-button.tsx` — dark URL megjelenítő
- `src/components/features/match-share-button.tsx` — dark URL megjelenítő
- `src/components/features/transfer-admin-button.tsx` — amber warning stílus

---

## Javított hibák a redesign során

| Hiba                                           | Megoldás                                                                |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| `onMouseOver`/`onMouseOut` Server Componentben | CSS `:hover` pseudo-class (`.card-link`, `.btn-secondary:hover`)        |
| Duplicate `export default`                     | Régi kód maradványok eltávolítva (groups/page.tsx, login/page.tsx)      |
| Lógó JSX a fájl végén                          | Régi blokkok eltávolítva (groups/[id]/page.tsx, match/[token]/page.tsx) |
| Michroma `next/font/google`-ban nem létezik    | CSS `@import url(...)` megoldás                                         |
| `@import url` rossz helyen (PostCSS hiba)      | Google Fonts import a `@import "tailwindcss"` **elé** kerül             |
