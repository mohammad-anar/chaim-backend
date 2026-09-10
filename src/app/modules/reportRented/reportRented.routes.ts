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

// Owner: View Report Rented Stats
router.get("/stats", auth(), ReportRentedController.getReportRentedStats);

// Owner: View Unpaid Dues Summary & IDs
router.get("/my-dues", auth(), ReportRentedController.getMyReportRentedDues);

// Owner: View all historical reports
router.get("/my-reports", auth(), ReportRentedController.getMyReportedRented);

// Owner: Batch-pay all unpaid dues
router.post(
  "/pay-all",
  auth(),
  validateRequest(ReportRentedValidation.payAllReportRentedDuesZodSchema),
  ReportRentedController.payAllReportRentedDues,
);

// Owner: Pay a specific report rented due by ID
router.post(
  "/:id/pay",
  auth(),
  validateRequest(ReportRentedValidation.paySingleReportRentedZodSchema),
  ReportRentedController.paySingleReportRented,
);

// Admin: View all platform rental reports
router.get("/admin/all", auth(UserRole.SUPER_ADMIN), ReportRentedController.getAllReportRentedAdmin);

// Admin: Mark reported rented as paid
router.patch("/:id/mark-paid", auth(UserRole.SUPER_ADMIN), ReportRentedController.markReportAsPaidAdmin);

export const ReportRentedRoutes = router;
