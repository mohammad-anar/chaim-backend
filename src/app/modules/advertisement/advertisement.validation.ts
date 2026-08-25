import { z } from "zod";

const createAdvertisementZodSchema = z.object({
  body: z.object({
    title: z.string().min(2, "Title is required"),
    image: z.string().min(1, "Image URL is required"),
    targetUrl: z.string().optional(),
    position: z.enum(["HOME_TOP", "HOME_MIDDLE", "SIDEBAR", "FOOTER"]).optional(),
    isActive: z.boolean().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

const updateAdvertisementZodSchema = z.object({
  body: z.object({
    title: z.string().min(2).optional(),
    image: z.string().min(1).optional(),
    targetUrl: z.string().optional(),
    position: z.enum(["HOME_TOP", "HOME_MIDDLE", "SIDEBAR", "FOOTER"]).optional(),
    isActive: z.boolean().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

export const AdvertisementValidation = {
  createAdvertisementZodSchema,
  updateAdvertisementZodSchema,
};
