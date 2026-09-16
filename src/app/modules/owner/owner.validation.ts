import { z } from "zod";
import { DayOfWeek, NotificationPreference } from "@prisma/client";

const parseOptionalBoolean = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined || val === "undefined" || val === "null") {
    return undefined;
  }
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const lower = val.trim().toLowerCase();
    if (lower === "true" || lower === "1") return true;
    if (lower === "false" || lower === "0") return false;
  }
  if (typeof val === "number") {
    if (val === 1) return true;
    if (val === 0) return false;
  }
  return val;
}, z.boolean().optional());

const sendAvailabilityReminderZodSchema = z.object({
  apartmentId: z.string().optional(),
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
  apartmentId: z.string().optional(),
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
  preferredTime: z.string().optional().nullable(),
  isPaused: parseOptionalBoolean,
  allowReminder: parseOptionalBoolean,
  specificReminderDate: z.union([z.string(), z.date()]).optional().nullable(),
});

export const OwnerValidation = {
  sendAvailabilityReminderZodSchema,
  sendPaymentDueReminderZodSchema,
  upsertOwnerNotificationPrefZodSchema,
};

