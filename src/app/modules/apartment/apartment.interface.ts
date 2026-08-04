import { HowToContact, PropertyType, ApartmentStatus } from "@prisma/client";

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
  amenities?: string[];
  coverImage?: string;
  images?: string[];
  phoneNumber?: string;
  whatsApp?: string;
  howToContact?: HowToContact;
  additionalDetails?: string;
};

export type IUpdateApartment = Partial<ICreateApartment>;

export type IApartmentFilterRequest = {
  searchTerm?: string;
  city?: string;
  neighborhood?: string;
  propertyType?: PropertyType;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  maxGuest?: number;
  status?: ApartmentStatus;
};
