import { z } from "zod";

const createReportRentedIntentZodSchema = z
  .object({
    apartmentId: z.string().optional(),
    reportType: z.enum(["RENT", "SWAP"]).optional(),
    targetApartmentId: z.string().optional(),
    weekend: z.string().optional(),
    weekends: z.array(z.string()).optional(),
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
  )
  .refine(
    (data) => {
      if (data.reportType === "SWAP" && data.weekends && data.weekends.length > 1) {
        return false;
      }
      return true;
    },
    {
      message: "Multiple weekends cannot be selected for SWAP reports. Please select a single weekend.",
      path: ["weekends"],
    },
  );

const paySingleReportRentedZodSchema = z.object({
  paymentMethod: z.enum(["CARD", "NEDARIM_PLUS"]),
  transactionId: z.string().optional(),
});

const payAllReportRentedDuesZodSchema = z.object({
  paymentMethod: z.enum(["CARD", "NEDARIM_PLUS"]),
  transactionId: z.string().optional(),
  reportRentedIds: z.array(z.string()).optional(),
});

export const ReportRentedValidation = {
  createReportRentedIntentZodSchema,
  paySingleReportRentedZodSchema,
  payAllReportRentedDuesZodSchema,
};
