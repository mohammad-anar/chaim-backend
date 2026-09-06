import { z } from "zod";

const directCardPaymentZodSchema = z.object({
  paymentType: z.enum(["LISTING", "REPORT_RENTED", "SWAP", "APARTMENT_LISTING", "SWAP_REQUEST"]),
  apartmentId: z.string().optional(),
  reportRentedId: z.string().optional(),
  swapId: z.string().optional(),
  paymentRecordId: z.string().optional(),
  cardNumber: z.string().optional(),
  cardHolder: z.string().optional(),
  expiryDate: z.string().optional(),
  expirationDate: z.string().optional(),
  cvv: z.string().optional(),
  idNumber: z.string().optional(),
});

const createListingPaymentIntentZodSchema = z.object({
  apartmentId: z.string().min(1, "Apartment ID is required"),
});

const createSwapPaymentIntentZodSchema = z.object({
  swapId: z.string().min(1, "Swap ID is required"),
});

const createReportRentedPaymentIntentZodSchema = z.object({
  reportRentedId: z.string().optional(),
  apartmentId: z.string().optional(),
  targetApartmentId: z.string().optional(),
  reportType: z.enum(["RENT", "SWAP"]).optional(),
  weekend: z.string().optional(),
});

const verifyNedarimPaymentZodSchema = z.object({
  transactionId: z.string().min(1, "Transaction ID is required"),
  paymentType: z.enum(["APARTMENT_LISTING", "SWAP_REQUEST", "REPORT_RENTED"]),
  paymentRecordId: z.string().optional(),
  apartmentId: z.string().optional(),
  swapId: z.string().optional(),
  reportRentedId: z.string().optional(),
});

export const PaymentValidation = {
  directCardPaymentZodSchema,
  createListingPaymentIntentZodSchema,
  createSwapPaymentIntentZodSchema,
  createReportRentedPaymentIntentZodSchema,
  verifyNedarimPaymentZodSchema,
};
