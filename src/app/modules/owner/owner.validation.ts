import { z } from "zod";
import { DayOfWeek, NotificationPreference } from "@prisma/client";

const sendAvailabilityReminderZodSchema = z.object({
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
  adminPhone: z.string().optional(),
  channel: z.enum([
    NotificationPreference.EMAIL,
    NotificationPreference.PHONE,
    NotificationPreference.BOTH,
  ]).optional(),
});

const sendPaymentDueReminderZodSchema = z.object({
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
  adminPhone: z.string().optional(),
  amount: z.number().optional(),
  channel: z.enum([
    NotificationPreference.EMAIL,
    NotificationPreference.PHONE,
    NotificationPreference.BOTH,
  ]).optional(),
});

const upsertOwnerNotificationPrefZodSchema = z.object({
  channel: z.enum([
    NotificationPreference.EMAIL,
    NotificationPreference.PHONE,
    NotificationPreference.BOTH,
  ]).optional(),
  notificationEmail: z.string().email("Invalid email format").optional().nullable(),
  notificationPhone: z.string().optional().nullable(),
  preferredDay: z.enum([
    DayOfWeek.SUNDAY,
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
  ]).optional().nullable(),
  preferredTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)")
    .optional()
    .nullable(),
});

export const OwnerValidation = {
  sendAvailabilityReminderZodSchema,
  sendPaymentDueReminderZodSchema,
  upsertOwnerNotificationPrefZodSchema,
};

