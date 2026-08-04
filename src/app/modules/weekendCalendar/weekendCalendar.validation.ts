import { z } from "zod";

const createWeekendCalendarZodSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
});

const updateWeekendCalendarZodSchema = z.object({
  title: z.string().optional(),
  date: z.string().optional(),
});

export const WeekendCalendarValidation = {
  createWeekendCalendarZodSchema,
  updateWeekendCalendarZodSchema,
};
