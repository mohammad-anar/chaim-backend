export type ICreateOrUpdateSwapPreference = {
  isEnabled?: boolean;
  city?: string;
  neighborhood?: string;
  rooms?: number;
  beds?: number;
  weekend?: string | Date;
  whatsApp?: string;
  email?: string;
};

export type ISwapPreferenceFilterRequest = {
  city?: string;
  neighborhood?: string;
  rooms?: number | string;
  beds?: number | string;
  isEnabled?: boolean | string;
  // Targeted destination search — mutually exclusive with city/neighborhood when all 3 are present
  destLat?: number | string;
  destLng?: number | string;
  walkingMinutes?: number | string; // max walking minutes from destLat/destLng
};

