import express from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth.js";
import fileUploadHandler from "../../middlewares/fileUploadHandler.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { WeekendCalendarController } from "./weekendCalendar.controller.js";
import { WeekendCalendarValidation } from "./weekendCalendar.validation.js";

const router = express.Router();

router.post(
  "/",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(WeekendCalendarValidation.createWeekendCalendarZodSchema),
  WeekendCalendarController.createWeekendCalendar,
);

router.post(
  "/upload-csv",
  auth(UserRole.SUPER_ADMIN),
  fileUploadHandler(),
  WeekendCalendarController.uploadCsv,
);

router.get(
  "/",
  WeekendCalendarController.getAllWeekendCalendars,
);

router.get(
  "/:id",
  WeekendCalendarController.getWeekendCalendarById,
);

router.patch(
  "/:id",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(WeekendCalendarValidation.updateWeekendCalendarZodSchema),
  WeekendCalendarController.updateWeekendCalendar,
);

router.delete(
  "/:id",
  auth(UserRole.SUPER_ADMIN),
  WeekendCalendarController.deleteWeekendCalendar,
);

export const WeekendCalendarRoutes = router;
