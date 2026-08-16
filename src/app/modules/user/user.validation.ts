import { z } from "zod";
import { UserStatus } from "@prisma/client";

const updateProfileZodSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.email().optional(),
  phone: z.string().optional(),
});

const updateUserStatusZodSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.BLOCKED, UserStatus.SUSPENDED]),
});

export const UserValidation = {
  updateProfileZodSchema,
  updateUserStatusZodSchema,
};
