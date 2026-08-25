import { AmbassadorModel, AmbassadorStatus, AttributionMethod, AttributionStatus, CommissionStatus, CommissionType, PayoutStatus } from "@prisma/client";

export interface IAmbassadorRates {
  modelAListing: number;
  modelARental: number;
  modelBListing: number;
  modelBRental: number;
  subReferralListing: number;
}

export const DEFAULT_AMBASSADOR_RATES: IAmbassadorRates = {
  modelAListing: 15,
  modelARental: 25,
  modelBListing: 25,
  modelBRental: 40,
  subReferralListing: 5,
};

export interface IRegisterAmbassadorPayload {
  name: string;
  email: string;
  phone: string;
  password?: string;
  recruitmentCode?: string;
}

export interface ILoginAmbassadorPayload {
  identifier: string; // email or phone
  password?: string;
}

export interface IUpdateAmbassadorSettingsPayload {
  defaultModel?: AmbassadorModel;
  payoutDetails?: {
    bankName?: string;
    accountNumber?: string;
    branchNumber?: string;
    notes?: string;
  };
}

export interface IManualClaimApartmentPayload {
  ownerName?: string;
  ownerPhone: string;
  ownerEmail?: string;
  model: AmbassadorModel;
}

export interface ISelectAttributionModelPayload {
  attributionId: string;
  model: AmbassadorModel;
}

export interface IRequestPayoutPayload {
  amount?: number;
}

export interface IAdminReviewApplicationPayload {
  status: "APPROVED" | "REJECTED";
  customReferralCode?: string;
  rates?: Partial<IAmbassadorRates>;
}

export interface IAdminRelinkAttributionPayload {
  attributionId: string;
  newAmbassadorId?: string;
  newModel?: AmbassadorModel;
}

export interface IAdminApproveFeePayload {
  commissionId?: string;
  sourceListingId?: string;
}

export interface IAdminReverseCommissionPayload {
  commissionId: string;
  reason?: string;
}

export interface IAdminProcessPayoutPayload {
  status: "PAID" | "REJECTED";
  referenceCode?: string;
  rejectionReason?: string;
}

export interface IAmbassadorBalances {
  pendingBalance: number;
  approvedBalance: number;
  totalPaid: number;
  totalEarned: number;
}
