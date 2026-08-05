import { z } from "zod";

const createReportRentedIntentZodSchema = z.object({
  bookingId: z.string().optional(),
  weekend: z.string().optional(),
});

export const ReportRentedValidation = {
  createReportRentedIntentZodSchema,
};
