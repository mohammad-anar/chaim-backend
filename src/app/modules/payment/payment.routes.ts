import express from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth.js";
import { PaymentController } from "./payment.controller.js";

const router = express.Router();

router.post(
  "/create-listing-intent",
  auth(),
  PaymentController.createListingPaymentIntent,
);

router.post(
  "/create-swap-intent",
  auth(),
  PaymentController.createSwapPaymentIntent,
);

router.post(
  "/create-report-rented-intent",
  auth(),
  PaymentController.createReportRentedPaymentIntent,
);

router.post(
  "/verify-nedarim",
  auth(),
  PaymentController.verifyNedarimPayment,
);

router.post(
  "/nedarim-callback",
  PaymentController.handleNedarimCallback,
);

router.get(
  "/nedarim-callback",
  PaymentController.handleNedarimCallback,
);

// Admin: View all platform payment transactions
router.get(
  "/admin/all-transactions",
  auth(UserRole.SUPER_ADMIN),
  PaymentController.getAdminAllTransactions,
);

export const PaymentRoutes = router;
