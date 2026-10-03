import { z } from "zod";

const createAdvertisementZodSchema = z.object({
  companyName: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  image: z.string().optional(),
  url: z.string().optional(),
  targetUrl: z.string().optional(),
  position: z.enum(["HOME_TOP", "HOME_MIDDLE", "SIDEBAR", "FOOTER"]).optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const updateAdvertisementZodSchema = z.object({
  companyName: z.string().optional(),
  title: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  image: z.string().optional(),
  url: z.string().optional(),
  targetUrl: z.string().optional(),
  position: z.enum(["HOME_TOP", "HOME_MIDDLE", "SIDEBAR", "FOOTER"]).optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const AdvertisementValidation = {
  createAdvertisementZodSchema,
  updateAdvertisementZodSchema,
};
