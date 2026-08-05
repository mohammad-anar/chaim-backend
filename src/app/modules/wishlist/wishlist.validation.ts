import { z } from "zod";

const toggleWishlistZodSchema = z.object({
  apartmentId: z.string().min(1, "Apartment ID is required"),
});

export const WishlistValidation = {
  toggleWishlistZodSchema,
};
