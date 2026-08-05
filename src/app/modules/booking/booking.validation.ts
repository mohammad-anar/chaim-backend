import { z } from "zod";
import { BookingStatus } from "@prisma/client";

const createBookingZodSchema = z.object({
  apartmentId: z.string().min(1, "Apartment ID is required"),
  weekendId: z.string().min(1, "Weekend ID is required"),
  totalAmount: z.number().min(1, "Total amount must be greater than 0"),
});

const updateBookingStatusZodSchema = z.object({
  status: z.enum([
    BookingStatus.PENDING,
    BookingStatus.CONFIRMED,
    BookingStatus.CANCELLED,
    BookingStatus.COMPLETED,
  ]),
});

export const BookingValidation = {
  createBookingZodSchema,
  updateBookingStatusZodSchema,
};
