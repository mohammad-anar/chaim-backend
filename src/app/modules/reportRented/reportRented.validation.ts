import { z } from "zod";

const createReportRentedIntentZodSchema = z
  .object({
    reportType: z.enum(["RENT", "SWAP"]).optional(),
    targetApartmentId: z.string().optional(),
    weekend: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.reportType === "SWAP" && !data.targetApartmentId) {
        return false;
      }
      return true;
    },
    {
      message: "targetApartmentId is required when reportType is SWAP",
      path: ["targetApartmentId"],
    },
  );

export const ReportRentedValidation = {
  createReportRentedIntentZodSchema,
};
