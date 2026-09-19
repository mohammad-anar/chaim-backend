import { z } from "zod";

const createOrUpdateSwapPreferenceZodSchema = z.object({
  apartmentId: z.string().optional(),
  isEnabled: z.boolean().optional(),
  city: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  rooms: z.coerce.number().int().optional().nullable(),
  beds: z.coerce.number().int().optional().nullable(),
  weekend: z.string().optional().nullable(),
  whatsApp: z.string().optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
});

export const SwapPreferenceValidation = {
  createOrUpdateSwapPreferenceZodSchema,
};

