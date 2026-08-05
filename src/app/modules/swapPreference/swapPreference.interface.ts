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
};
