import { z } from "zod";
import { UserStatus } from "@prisma/client";

const updateProfileZodSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  email: z.email("Invalid email format").optional(),
  phone: z.string().optional(),
  marketingPlatformId: z.string().optional(),
});

const updateUserStatusZodSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.BLOCKED, UserStatus.SUSPENDED]),
});

const sendPaymentDueReminderZodSchema = z.object({
  message: z.string().optional(),
  amount: z.number().positive().optional(),
});

export const UserValidation = {
  updateProfileZodSchema,
  updateUserStatusZodSchema,
  sendPaymentDueReminderZodSchema,
};
