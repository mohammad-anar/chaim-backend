import { z } from "zod";

const createMarketingPlatformZodSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    platform: z.string().min(1, "Platform name is required"),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  }),
});

const updateMarketingPlatformZodSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    platform: z.string().min(1).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  }),
});

export const MarketingPlatformValidation = {
  createMarketingPlatformZodSchema,
  updateMarketingPlatformZodSchema,
};
