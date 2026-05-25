FociGo is a Next.js web application that helps groups of friends organize football matches, manage teams, send invites, and track RSVPs. The goal is to make community sports event organization simple and transparent.

## Main Features

- Create and manage groups
- Organize, edit, and delete matches
- Generate invite links, handle guest RSVPs
- Transfer admin rights
- Real-time RSVP updates

## Tech Stack

- Next.js (React, App Router)
- TypeScript
- Supabase (database, authentication, real-time)
- Tailwind CSS (styling)
- ESLint, Prettier (code quality)

## Getting Started

1. Install dependencies:
	```bash
	npm install
	```
2. Start the development server:
	```bash
	npm run dev
	```
3. (Optional) Set up Supabase environment variables in a `.env.local` file.

## Key Folders

- `src/app/` – Pages and routes
- `src/components/` – Reusable components
- `src/lib/` – Supabase client, validation
- `src/types/` – Type definitions
- `supabase/` – Database migrations, seed

## Database

Supabase migrations are in `supabase/migrations/`. Seed data is in `supabase/seed.sql`.

## Contributing

Pull requests and bug reports are welcome!
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

