import { z } from "zod";

export const CreateGroupSchema = z.object({
  name: z
    .string()
    .min(1, "A csoport neve kötelező")
    .max(100, "A csoport neve legfeljebb 100 karakter lehet"),
  default_venue: z
    .string()
    .max(200, "A helyszín neve legfeljebb 200 karakter lehet")
    .optional(),
  default_schedule: z
    .string()
    .max(100, "A menetrend leírása legfeljebb 100 karakter lehet")
    .optional(),
  default_venue_fee: z.coerce
    .number()
    .int("A terembérlési díj egész szám kell legyen")
    .min(0, "A terembérlési díj nem lehet negatív")
    .optional(),
});

export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;
