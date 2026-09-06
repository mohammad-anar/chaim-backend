import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { ApartmentAvailabilityController } from "./apartmentAvailability.controller.js";
import { ApartmentAvailabilityValidation } from "./apartmentAvailability.validation.js";
import { WeekendCalendarController } from "../weekendCalendar/weekendCalendar.controller.js";

const router = express.Router();

router.get("/weekends", WeekendCalendarController.getAllWeekendCalendars);

router.post(
  "/add",
  auth(),
  validateRequest(ApartmentAvailabilityValidation.toggleAvailabilityZodSchema),
  ApartmentAvailabilityController.addAvailability,
);

router.post(
  "/remove",
  auth(),
  validateRequest(ApartmentAvailabilityValidation.toggleAvailabilityZodSchema),
  ApartmentAvailabilityController.removeAvailability,
);

router.post(
  "/bulk-set",
  auth(),
  validateRequest(ApartmentAvailabilityValidation.bulkSetAvailabilityZodSchema),
  ApartmentAvailabilityController.bulkSetAvailability,
);

router.post(
  "/special-price",
  auth(),
  ApartmentAvailabilityController.setSpecialWeekendDirect,
);

// Dedicated route to toggle special weekend pricing for a specific availability record
router.patch(
  "/:availabilityId/special",
  auth(),
  validateRequest(ApartmentAvailabilityValidation.setSpecialWeekendZodSchema),
  ApartmentAvailabilityController.setSpecialWeekend,
);

router.get(
  "/:apartmentId",
  ApartmentAvailabilityController.getApartmentAvailabilities,
);

export const ApartmentAvailabilityRoutes = router;
