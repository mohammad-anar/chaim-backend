import { z } from "zod";

const createNotifyRequestZodSchema = z.object({
  apartmentId: z.string().min(1, "Apartment ID is required"),
});

export const NotifyRequestValidation = {
  createNotifyRequestZodSchema,
};
