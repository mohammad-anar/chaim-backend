import { z } from "zod";
import { HowToContact, PropertyType, ApartmentStatus } from "@prisma/client";

const createApartmentZodSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  city: z.string().min(1, "City is required"),
  neighborhood: z.string().min(1, "Neighborhood is required"),
  street1: z.string().optional(),
  street2: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  propertyType: z.enum([PropertyType.APARTMENT, PropertyType.VILLA, PropertyType.PENTHOUSE, PropertyType.STUDIO]),
  bedrooms: z.coerce.number().int().min(1, "Bedrooms must be at least 1"),
  bathrooms: z.coerce.number().int().min(1, "Bathrooms must be at least 1"),
  maxGuest: z.coerce.number().int().min(0, "Max guest must be at least 0"),
  pricePerShabbat: z.coerce.number().min(1, "Price per Shabbat must be greater than 0"),
  neighborhoodWalkingTime: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  phoneNumber: z.string().optional(),
  whatsApp: z.string().optional(),
  howToContact: z.enum([HowToContact.PHONE, HowToContact.WHATSAPP, HowToContact.BOTH]).optional(),
  additionalDetails: z.string().optional(),
  referralCode: z.string().optional(),
});

const updateApartmentZodSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  street1: z.string().optional(),
  street2: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  propertyType: z.enum([PropertyType.APARTMENT, PropertyType.VILLA, PropertyType.PENTHOUSE, PropertyType.STUDIO]).optional(),
  bedrooms: z.coerce.number().int().optional(),
  bathrooms: z.coerce.number().int().optional(),
  maxGuest: z.coerce.number().int().optional(),
  pricePerShabbat: z.coerce.number().optional(),
  neighborhoodWalkingTime: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  phoneNumber: z.string().optional(),
  whatsApp: z.string().optional(),
  howToContact: z.enum([HowToContact.PHONE, HowToContact.WHATSAPP, HowToContact.BOTH]).optional(),
  additionalDetails: z.string().optional(),
});

const updateApartmentStatusZodSchema = z.object({
  status: z.enum([ApartmentStatus.PENDING, ApartmentStatus.CONFIRMED, ApartmentStatus.REJECTED, ApartmentStatus.SUSPENDED]),
});

export const ApartmentValidation = {
  createApartmentZodSchema,
  updateApartmentZodSchema,
  updateApartmentStatusZodSchema,
};
