import { z } from "zod";

const createInterestedRequestZodSchema = z.object({
  apartmentId: z.string().min(1, "Apartment ID is required"),
});

export const InterestedRequestValidation = {
  createInterestedRequestZodSchema,
};
