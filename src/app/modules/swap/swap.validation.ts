import { z } from "zod";
import { SwapStatus } from "@prisma/client";

const createSwapRequestZodSchema = z.object({
  toAppId: z.string().min(1, "Target apartment ID (toAppId) is required"),
});

const updateSwapStatusZodSchema = z.object({
  status: z.enum([SwapStatus.PENDING, SwapStatus.APPROVED, SwapStatus.REJECTED]),
});

export const SwapValidation = {
  createSwapRequestZodSchema,
  updateSwapStatusZodSchema,
};
