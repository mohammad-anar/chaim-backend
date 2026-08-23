export type ICreateListingPaymentPayload = {
  apartmentId: string;
};

export type ICreateSwapPaymentPayload = {
  swapId: string;
};

export type ICreateReportRentedPaymentPayload = {
  reportRentedId?: string;
  apartmentId?: string;
  targetApartmentId?: string;
  reportType?: "RENT" | "SWAP";
  weekend?: string;
};

export type IVerifyNedarimPaymentPayload = {
  transactionId: string;
  paymentType: "APARTMENT_LISTING" | "SWAP_REQUEST" | "REPORT_RENTED";
  paymentRecordId?: string; // listingPaymentId, swapPaymentId, or reportRentedPaymentId
  apartmentId?: string;
  swapId?: string;
  reportRentedId?: string;
};
