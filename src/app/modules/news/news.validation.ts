import { z } from "zod";

const createNewsZodSchema = z.object({
  body: z.object({
    title: z.string().min(2, "Title must be at least 2 characters"),
    content: z.string().min(5, "Content must be at least 5 characters"),
    summary: z.string().optional(),
    image: z.string().optional(),
    author: z.string().optional(),
    isPublished: z.boolean().optional(),
  }),
});

const updateNewsZodSchema = z.object({
  body: z.object({
    title: z.string().min(2).optional(),
    content: z.string().min(5).optional(),
    summary: z.string().optional(),
    image: z.string().optional(),
    author: z.string().optional(),
    isPublished: z.boolean().optional(),
  }),
});

export const NewsValidation = {
  createNewsZodSchema,
  updateNewsZodSchema,
};
