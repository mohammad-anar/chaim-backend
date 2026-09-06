import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { ReportRentedController } from "./reportRented.controller.js";
import { ReportRentedValidation } from "./reportRented.validation.js";

import { UserRole } from "@prisma/client";

const router = express.Router();

router.post(
  "/create-intent",
  auth(),
  validateRequest(ReportRentedValidation.createReportRentedIntentZodSchema),
  ReportRentedController.createReportRentedIntent,
);

router.get("/my-reports", auth(), ReportRentedController.getMyReportedRented);

// Admin: View all platform rental reports
router.get("/admin/all", auth(UserRole.SUPER_ADMIN), ReportRentedController.getAllReportRentedAdmin);

// Admin: Mark reported rented as paid
router.patch("/:id/mark-paid", auth(UserRole.SUPER_ADMIN), ReportRentedController.markReportAsPaidAdmin);

export const ReportRentedRoutes = router;
