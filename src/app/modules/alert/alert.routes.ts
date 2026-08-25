import express from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { AlertController } from "./alert.controller.js";
import { AlertValidation } from "./alert.validation.js";

const router = express.Router();

// Authenticated users: Get active broadcast alerts
router.get("/my-alerts", auth(), AlertController.getMyAlerts);

// Admin: Get all alerts history
router.get("/", auth(UserRole.SUPER_ADMIN), AlertController.getAllAlerts);

// Admin: Broadcast new alert
router.post(
  "/",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(AlertValidation.createAlertZodSchema),
  AlertController.createAlert,
);

// Admin: Update alert
router.patch(
  "/:id",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(AlertValidation.updateAlertZodSchema),
  AlertController.updateAlert,
);

// Admin: Delete alert
router.delete(
  "/:id",
  auth(UserRole.SUPER_ADMIN),
  AlertController.deleteAlert,
);

export const AlertRoutes = router;
