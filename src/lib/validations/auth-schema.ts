import { z } from "zod";

export const EmailSchema = z.object({
  email: z
    .string()
    .min(1, "Az email cím megadása kötelező")
    .email("Érvénytelen email cím formátum"),
});

export type EmailInput = z.infer<typeof EmailSchema>;
