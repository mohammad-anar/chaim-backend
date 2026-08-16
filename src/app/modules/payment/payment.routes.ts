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
  "/verify-intent",
  auth(),
  PaymentController.confirmPaymentIntent,
);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  PaymentController.handleStripeWebhook,
);

export const PaymentRoutes = router;
