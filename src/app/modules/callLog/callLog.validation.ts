import { z } from "zod";

const initiateCallZodSchema = z.object({
  receiverId: z.string().min(1, "Receiver User ID is required"),
  apartmentId: z.string().optional(),
});

export const CallLogValidation = {
  initiateCallZodSchema,
};
