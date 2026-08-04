import { z } from "zod";

const toggleAvailabilityZodSchema = z.object({
  apartmentId: z.string().min(1, "Apartment ID is required"),
  weekendId: z.string().min(1, "Weekend ID is required"),
});

const bulkSetAvailabilityZodSchema = z.object({
  apartmentId: z.string().min(1, "Apartment ID is required"),
  weekendIds: z.array(z.string()).min(1, "At least one weekend ID is required"),
});

export const ApartmentAvailabilityValidation = {
  toggleAvailabilityZodSchema,
  bulkSetAvailabilityZodSchema,
};
