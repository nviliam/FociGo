import { z } from "zod";

/**
 * CreateMatchSchema — meccs létrehozás form validáció
 *
 * Mezők:
 * - venue: helyszín (kötelező)
 * - match_date: meccs dátuma és időpontja (kötelező, datetime-local input)
 * - venue_fee: terembér fillérben (opcionális, egész szám)
 * - rsvp_deadline: RSVP határidő (opcionális, datetime-local input)
 */
export const CreateMatchSchema = z.object({
  venue: z
    .string()
    .min(1, "A helyszín megadása kötelező")
    .max(200, "A helyszín maximum 200 karakter lehet"),

  // datetime-local input stringet küld (pl. "2026-05-10T18:00")
  // .pipe(z.coerce.date()) → Date objektummá alakítja
  // .refine → múltbeli dátumot nem engedünk
  match_date: z
    .string()
    .min(1, "A meccs dátuma kötelező")
    .pipe(z.coerce.date())
    .refine((d) => d > new Date(), {
      message: "A meccs dátuma nem lehet múltbeli",
    }),

  venue_fee: z.coerce
    .number()
    .int("A terembér egész szám kell legyen")
    .min(0, "A terembér nem lehet negatív")
    .optional(),

  rsvp_deadline: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v || v.length === 0) return true; // üres → rendben
        const d = new Date(v);
        return !isNaN(d.getTime()) && d > new Date();
      },
      { message: "Az RSVP határidő nem lehet múltbeli" },
    ),
});

export type CreateMatchInput = z.infer<typeof CreateMatchSchema>;
