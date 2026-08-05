import { z } from "zod";

const createOrUpdateSwapPreferenceZodSchema = z.object({
  isEnabled: z.boolean().optional(),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  rooms: z.coerce.number().int().optional(),
  beds: z.coerce.number().int().optional(),
  weekend: z.string().optional(),
  whatsApp: z.string().optional(),
  email: z.string().email("Invalid email format").optional(),
});

export const SwapPreferenceValidation = {
  createOrUpdateSwapPreferenceZodSchema,
};
