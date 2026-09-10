import { DayOfWeek, NotificationPreference } from "@prisma/client";

export type IOwnerNotificationPreferencePayload = {
  channel?: NotificationPreference;
  notificationEmail?: string | null;
  notificationPhone?: string | null;
  preferredDay?: DayOfWeek | null;
  preferredTime?: string | null; // e.g. "09:00"
};

export type IOwnerFilterRequest = {
  searchTerm?: string;
  hasDue?: string; // "true" | "false"
  status?: string;
  channel?: NotificationPreference;
  notificationPreference?: NotificationPreference;
};

export type ISendReminderPayload = {
  emailSubject?: string;
  emailBody?: string; // HTML body from frontend rich text editor
  adminPhone?: string; // Admin phone number used to bridge Twilio call to owner SIM
  channel?: NotificationPreference;
};

export type ISendPaymentReminderPayload = ISendReminderPayload & {
  amount?: number; // Override auto-calculated due amount (ILS)
};

export type IOwnerFinancialSummary = {
  totalListings: number;
  totalEarnings: number;
  totalDue: number;
  unpaidReportsCount: number;
  unpaidReportsAmount: number;
  paidReportsCount: number;
  paidReportsAmount: number;
  listingEarnings: number;
  listingDue: number;
  hasOverduePayment: boolean;
};

