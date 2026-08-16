import { z } from "zod";

const createReviewZodSchema = z.object({
  apartmentId: z.string().min(1, "Apartment ID is required"),
  title: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  rating: z.number().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
});

export const ReviewValidation = {
  createReviewZodSchema,
};
