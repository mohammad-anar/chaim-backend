export type ICreateReportRentedIntent = {
  reportType?: "RENT" | "SWAP";
  targetApartmentId?: string; // UUID or propertyId like apart-001
  weekend?: string | Date;
};

export type IPayReportRentedPayload = {
  paymentMethod: "CARD" | "NEDARIM_PLUS";
  transactionId?: string; // Required for NEDARIM_PLUS
};

export type IPayAllReportRentedDuesPayload = {
  paymentMethod: "CARD" | "NEDARIM_PLUS";
  transactionId?: string; // Required for NEDARIM_PLUS
  reportRentedIds?: string[]; // Optional: if provided, pay specifically these; if omitted, pays all unpaid for user's apartment
};

export type IReportRentedStats = {
  totalReports: number;
  totalPendingCount: number;
  totalPendingAmount: number;
  totalPaidCount: number;
  totalPaidAmount: number;
  rentReportsCount: number;
  swapReportsCount: number;
  feePerReport: number;
};

export type IReportRentedDuesSummary = {
  totalDueAmount: number;
  unpaidCount: number;
  reportRentedIds: string[];
  reports: any[];
  feePerReport: number;
  mosadId: string;
};
