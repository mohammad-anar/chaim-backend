import express from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { OwnerController } from "./owner.controller.js";
import { OwnerValidation } from "./owner.validation.js";

const router = express.Router();

router.get(
  "/",
  auth(UserRole.SUPER_ADMIN),
  OwnerController.getAllOwners,
);

router.get(
  "/:id",
  auth(UserRole.SUPER_ADMIN),
  OwnerController.getSingleOwner,
);

router.post(
  "/:id/availability-reminder",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(OwnerValidation.sendAvailabilityReminderZodSchema),
  OwnerController.sendAvailabilityReminder,
);

router.post(
  "/:id/payment-due-reminder",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(OwnerValidation.sendPaymentDueReminderZodSchema),
  OwnerController.sendPaymentDueReminder,
);

export const OwnerRoutes = router;
