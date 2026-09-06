import express from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth.js";
import fileUploadHandler from "../../middlewares/fileUploadHandler.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { ApartmentController } from "./apartment.controller.js";
import { ApartmentValidation } from "./apartment.validation.js";
import { WeekendCalendarController } from "../weekendCalendar/weekendCalendar.controller.js";
import { ApartmentAvailabilityController } from "../apartmentAvailability/apartmentAvailability.controller.js";

const router = express.Router();

router.post(
  "/",
  auth(),
  fileUploadHandler(),
  validateRequest(ApartmentValidation.createApartmentZodSchema),
  ApartmentController.createApartment,
);

router.get(
  "/my-apartment",
  auth(),
  ApartmentController.getMyAppartment,
);

router.get(
  "/admin-details/:id",
  auth(UserRole.SUPER_ADMIN),
  ApartmentController.getAdminApartmentDetails,
);

router.get(
  "/",
  ApartmentController.getAllApartments,
);

router.get(
  "/availability/weekends",
  WeekendCalendarController.getAllWeekendCalendars,
);

router.post(
  "/availability/special-price",
  auth(),
  ApartmentAvailabilityController.setSpecialWeekendDirect,
);

router.get(
  "/:id",
  ApartmentController.getApartmentById,
);

router.post(
  "/remind-availability",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(ApartmentValidation.remindAvailabilityZodSchema),
  ApartmentController.sendAvailabilityReminder,
);

router.patch(
  "/block/:id",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(ApartmentValidation.blockApartmentZodSchema),
  ApartmentController.blockApartment,
);

router.patch(
  "/status/:id",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(ApartmentValidation.updateApartmentStatusZodSchema),
  ApartmentController.updateApartmentStatus,
);

router.patch(
  "/:id",
  auth(),
  fileUploadHandler(),
  validateRequest(ApartmentValidation.updateApartmentZodSchema),
  ApartmentController.updateApartment,
);

router.delete(
  "/:id",
  auth(),
  ApartmentController.deleteApartment,
);

export const ApartmentRoutes = router;
