import { z } from "zod";

const getMonthlyRevenueQueryZodSchema = z.object({
  year: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 2020), {
      message: "Year must be a valid number >= 2020",
    }),
  month: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val || (!isNaN(Number(val)) && Number(val) >= 1 && Number(val) <= 12),
      {
        message: "Month must be between 1 and 12",
      },
    ),
});

const getRecentActivityQueryZodSchema = z.object({
  limit: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
      message: "Limit must be a positive number",
    }),
});

export const AdminValidation = {
  getMonthlyRevenueQueryZodSchema,
  getRecentActivityQueryZodSchema,
};
