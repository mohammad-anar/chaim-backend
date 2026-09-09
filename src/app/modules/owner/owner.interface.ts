export type IOwnerFilterRequest = {
  searchTerm?: string;
  hasDue?: string; // "true" | "false"
  status?: string;
  notificationPreference?: "EMAIL" | "PHONE" | "BOTH";
};

export type ISendReminderPayload = {
  emailSubject?: string;
  emailBody?: string; // HTML body from frontend rich text editor
  adminPhone?: string; // Admin phone number used to bridge Twilio call to owner SIM
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
