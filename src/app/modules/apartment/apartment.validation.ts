import { z } from "zod";
import { HowToContact, PropertyType, ApartmentStatus } from "@prisma/client";

const parseOptionalNumber = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined || val === "undefined" || val === "null") {
    return undefined;
  }
  const num = Number(val);
  return isNaN(num) ? undefined : num;
}, z.number().optional());

const parseOptionalInt = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined || val === "undefined" || val === "null") {
    return undefined;
  }
  const num = Number(val);
  return isNaN(num) ? undefined : Math.round(num);
}, z.number().int().optional());

const parseRequiredInt = (minVal = 1, message = "Value is required") =>
  z.preprocess((val) => {
    const num = Number(val);
    return isNaN(num) ? val : Math.round(num);
  }, z.number().int().min(minVal, message));

const parseRequiredNumber = (minVal = 1, message = "Value is required") =>
  z.preprocess((val) => {
    const num = Number(val);
    return isNaN(num) ? val : num;
  }, z.number().min(minVal, message));

const parseAmenities = z.preprocess((val) => {
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return val;
}, z.array(z.string()).optional());

const parseOptionalString = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined || val === "undefined" || val === "null") {
    return undefined;
  }
  return String(val);
}, z.string().optional());

const createApartmentZodSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: parseOptionalString,
  city: z.string().min(1, "City is required"),
  neighborhood: z.string().min(1, "Neighborhood is required"),
  street1: parseOptionalString,
  street2: parseOptionalString,
  lat: parseOptionalNumber,
  lng: parseOptionalNumber,
  propertyType: z.enum([PropertyType.APARTMENT, PropertyType.VILLA, PropertyType.PENTHOUSE, PropertyType.STUDIO]),
  bedrooms: parseRequiredInt(1, "Bedrooms must be at least 1"),
  bathrooms: parseRequiredInt(1, "Bathrooms must be at least 1"),
  maxGuest: parseRequiredInt(0, "Max guest must be at least 0"),
  pricePerShabbat: parseRequiredNumber(1, "Price per Shabbat must be greater than 0"),
  neighborhoodWalkingTime: parseOptionalString,
  neighborhoodLat: parseOptionalNumber,
  neighborhoodLng: parseOptionalNumber,
  neighborhoodWalkingMinutes: parseOptionalInt,
  amenities: parseAmenities,
  phoneNumber: parseOptionalString,
  whatsApp: parseOptionalString,
  howToContact: z.enum([HowToContact.PHONE, HowToContact.WHATSAPP, HowToContact.BOTH]).optional(),
  additionalDetails: parseOptionalString,
  referralCode: parseOptionalString,
});

const updateApartmentZodSchema = z.object({
  title: z.string().optional(),
  description: parseOptionalString,
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  street1: parseOptionalString,
  street2: parseOptionalString,
  lat: parseOptionalNumber,
  lng: parseOptionalNumber,
  propertyType: z.enum([PropertyType.APARTMENT, PropertyType.VILLA, PropertyType.PENTHOUSE, PropertyType.STUDIO]).optional(),
  bedrooms: parseOptionalInt,
  bathrooms: parseOptionalInt,
  maxGuest: parseOptionalInt,
  pricePerShabbat: parseOptionalNumber,
  neighborhoodWalkingTime: parseOptionalString,
  neighborhoodLat: parseOptionalNumber,
  neighborhoodLng: parseOptionalNumber,
  neighborhoodWalkingMinutes: parseOptionalInt,
  amenities: parseAmenities,
  phoneNumber: parseOptionalString,
  whatsApp: parseOptionalString,
  howToContact: z.enum([HowToContact.PHONE, HowToContact.WHATSAPP, HowToContact.BOTH]).optional(),
  additionalDetails: parseOptionalString,
});

const updateApartmentStatusZodSchema = z.object({
  status: z.enum([
    ApartmentStatus.PENDING,
    ApartmentStatus.CONFIRMED,
    ApartmentStatus.REJECTED,
    ApartmentStatus.SUSPENDED,
    ApartmentStatus.BLOCKED,
  ]),
});

const blockApartmentZodSchema = z.object({
  isBlocked: z.boolean(),
  reason: z.string().optional(),
});

const remindAvailabilityZodSchema = z.object({
  weekendId: z.string().min(1, "Weekend ID is required"),
  apartmentId: z.string().optional(),
  message: z.string().optional(),
});

export const ApartmentValidation = {
  createApartmentZodSchema,
  updateApartmentZodSchema,
  updateApartmentStatusZodSchema,
  blockApartmentZodSchema,
  remindAvailabilityZodSchema,
};
