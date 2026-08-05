import { z } from "zod";

const createContactZodSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email address is required"),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(1, "Message is required"),
});

export const ContactValidation = {
  createContactZodSchema,
};
