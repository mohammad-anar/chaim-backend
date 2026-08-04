import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { ApartmentAvailabilityController } from "./apartmentAvailability.controller.js";
import { ApartmentAvailabilityValidation } from "./apartmentAvailability.validation.js";

const router = express.Router();

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

router.get(
  "/:apartmentId",
  ApartmentAvailabilityController.getApartmentAvailabilities,
);

export const ApartmentAvailabilityRoutes = router;
