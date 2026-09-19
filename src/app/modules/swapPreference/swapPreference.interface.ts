export type ICreateOrUpdateSwapPreference = {
  apartmentId?: string;
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
  minBedrooms?: number | string;
  beds?: number | string;
  minBeds?: number | string;
  weekend?: string;
  targetDestination?: string;
  searchTerm?: string;
  isEnabled?: boolean | string;
  // Targeted destination search — coordinates & walking radius
  destLat?: number | string;
  destLng?: number | string;
  walkingMinutes?: number | string; // max walking minutes from destLat/destLng
};


