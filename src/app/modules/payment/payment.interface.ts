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

export type IDirectCardPaymentPayload = {
  paymentType: "LISTING" | "REPORT_RENTED" | "SWAP" | "APARTMENT_LISTING" | "SWAP_REQUEST";
  apartmentId?: string;
  reportRentedId?: string;
  swapId?: string;
  paymentRecordId?: string;
  cardNumber?: string;
  cardHolder?: string;
  expiryDate?: string;
  expirationDate?: string;
  cvv?: string;
  idNumber?: string;
};
