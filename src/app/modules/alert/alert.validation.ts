import { z } from "zod";

const createAlertZodSchema = z.object({
  body: z.object({
    title: z.string().min(2, "Title is required"),
    message: z.string().min(2, "Message is required"),
    type: z.enum(["INFO", "WARNING", "SUCCESS", "URGENT"]).optional(),
    targetRole: z.enum(["USER", "AMBASSADOR", "SUPER_ADMIN"]).optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateAlertZodSchema = z.object({
  body: z.object({
    title: z.string().min(2).optional(),
    message: z.string().min(2).optional(),
    type: z.enum(["INFO", "WARNING", "SUCCESS", "URGENT"]).optional(),
    targetRole: z.enum(["USER", "AMBASSADOR", "SUPER_ADMIN"]).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const AlertValidation = {
  createAlertZodSchema,
  updateAlertZodSchema,
};
