import { z } from "zod";
import { OfferStatus } from "@prisma/client";

const createOfferZodSchema = z.object({
  apartmentId: z.string().min(1, "Apartment ID is required"),
  shabbosId: z.string().optional(),
  offerPrice: z.number().min(1, "Offer price must be greater than 0"),
  message: z.string().optional(),
});

const updateOfferStatusZodSchema = z.object({
  status: z.enum([OfferStatus.PENDING, OfferStatus.ACCEPTED, OfferStatus.REJECTED]),
});

export const OfferValidation = {
  createOfferZodSchema,
  updateOfferStatusZodSchema,
};
