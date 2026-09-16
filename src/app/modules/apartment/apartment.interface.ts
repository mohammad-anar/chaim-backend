import { PropertyType, ApartmentStatus } from "@prisma/client";

export type ICreateApartment = {
  title: string;
  description?: string;
  city: string;
  neighborhood: string;
  street1?: string;
  street2?: string;
  lat?: number;
  lng?: number;
  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number;
  maxGuest: number;
  pricePerShabbat: number;
  neighborhoodWalkingTime?: string | Date;
  neighborhoodLat?: number;
  neighborhoodLng?: number;
  neighborhoodWalkingMinutes?: number;
  amenities?: string[];
  coverImage?: string;
  images?: string[];
  phoneNumber?: string;
  whatsApp?: string;
  phone?: boolean;
  whatsapp?: boolean;
  email?: boolean;
  unavailable?: boolean;
  receiveRequestWhenUnavailable?: boolean;
  isActive?: boolean;
  additionalDetails?: string;
  referralCode?: string;
};

export type IUpdateApartment = Partial<ICreateApartment>;

export type IApartmentFilterRequest = {
  searchTerm?: string;
  city?: string;
  neighborhood?: string;
  propertyType?: PropertyType | PropertyType[] | string;
  minPrice?: number | string;
  maxPrice?: number | string;
  bedrooms?: number | string;
  rooms?: number | string;
  bathrooms?: number | string;
  maxGuest?: number | string;
  guestCount?: number | string;
  guests?: number | string;
  seats?: number | string;
  weekendId?: string;
  weekend?: string;
  date?: string;
  amenities?: string | string[];
  maxWalkingMinutes?: number | string;
  walkingMinutes?: number | string;
  walkingTime?: number | string;
  status?: ApartmentStatus;
  isActive?: boolean | string;
  unavailable?: boolean | string;
  receiveRequestWhenUnavailable?: boolean | string;
  // Targeted destination search
  destLat?: number | string;
  destLng?: number | string;
  targetDestination?: string;
  shulAddress?: string;
  destination?: string;
};
