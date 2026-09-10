import { SwapStatus } from "@prisma/client";

export type ICreateSwapRequest = {
  toAppId: string;
};

export type IUpdateSwapStatus = {
  status: SwapStatus;
};

export type ISwapFilterRequest = {
  status?: SwapStatus;
  searchTerm?: string;
  // Standard location filter
  city?: string;
  neighborhood?: string;
  // Targeted destination search — mutually exclusive with city/neighborhood when all 3 are present
  destLat?: string;
  destLng?: string;
  walkingMinutes?: string; // max walking minutes from destLat/destLng
};
