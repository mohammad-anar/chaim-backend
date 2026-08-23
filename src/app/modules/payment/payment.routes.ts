import express from "express";
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

export const PaymentRoutes = router;
