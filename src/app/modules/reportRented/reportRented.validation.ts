import { z } from "zod";

const createReportRentedIntentZodSchema = z.object({
  reportType: z.enum(["RENT", "SWAP"]).optional(),
  targetApartmentId: z.string().optional(),
  weekend: z.string().optional(),
});

export const ReportRentedValidation = {
  createReportRentedIntentZodSchema,
};
