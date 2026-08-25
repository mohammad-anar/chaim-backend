import { z } from "zod";

const initiateCallZodSchema = z.object({
  body: z
    .object({
      receiverId: z.string().optional(),
      apartmentId: z.string().optional(),
      channel: z.enum(["VOICE", "WHATSAPP", "EMAIL"]).optional(),
    })
    .refine((data) => data.receiverId || data.apartmentId, {
      message: "Either receiverId or apartmentId must be provided",
    }),
});

const initiateWhatsAppZodSchema = z.object({
  body: z
    .object({
      apartmentId: z.string().optional(),
      receiverId: z.string().optional(),
      message: z.string().optional(),
    })
    .refine((data) => data.apartmentId || data.receiverId, {
      message: "Either apartmentId or receiverId must be provided",
    }),
});

export const CallLogValidation = {
  initiateCallZodSchema,
  initiateWhatsAppZodSchema,
};
