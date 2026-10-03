import express from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { PaymentValidation } from "./payment.validation.js";
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
  "/direct-card",
  auth(),
  validateRequest(PaymentValidation.directCardPaymentZodSchema),
  PaymentController.processDirectCardPayment,
);

router.post(
  "/nedarim-callback",
  PaymentController.handleNedarimCallback,
);

router.get(
  "/nedarim-callback",
  PaymentController.handleNedarimCallback,
);

// Listing fee status (promo or standard ₪28) — public read
router.get(
  "/listing-fee-status",
  PaymentController.getListingFeeStatus,
);

// Free listing activation (only works when promo is ON)
router.post(
  "/activate-free-listing",
  auth(),
  PaymentController.activateFreeListing,
);

// Admin: View all platform payment transactions
router.get(
  "/admin/all-transactions",
  auth(UserRole.SUPER_ADMIN),
  PaymentController.getAdminAllTransactions,
);

// Admin: Toggle yearly listing fee promotion
router.patch(
  "/admin/yearly-fee-sale",
  auth(UserRole.SUPER_ADMIN),
  PaymentController.setYearlyFeeSaleStatus,
);

export const PaymentRoutes = router;

