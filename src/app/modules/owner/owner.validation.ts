import { z } from "zod";

const sendAvailabilityReminderZodSchema = z.object({
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
  adminPhone: z.string().optional(),
});

const sendPaymentDueReminderZodSchema = z.object({
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
  adminPhone: z.string().optional(),
  amount: z.number().optional(),
});

export const OwnerValidation = {
  sendAvailabilityReminderZodSchema,
  sendPaymentDueReminderZodSchema,
};
