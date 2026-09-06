import { z } from "zod";

const toggleAvailabilityZodSchema = z.object({
  apartmentId: z.string().min(1, "Apartment ID is required"),
  weekendId: z.string().min(1, "Weekend ID is required"),
});

const bulkSetAvailabilityZodSchema = z.object({
  apartmentId: z.string().min(1, "Apartment ID is required"),
  weekendIds: z.array(z.string()).min(1, "At least one weekend ID is required"),
});

const setSpecialWeekendZodSchema = z
  .object({
    isSpecial: z.boolean(),
    specialPrice: z.number().positive("Special price must be a positive number").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isSpecial && (data.specialPrice === undefined || data.specialPrice === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "specialPrice is required when isSpecial is true",
        path: ["specialPrice"],
      });
    }
  });

export const ApartmentAvailabilityValidation = {
  toggleAvailabilityZodSchema,
  bulkSetAvailabilityZodSchema,
  setSpecialWeekendZodSchema,
};
