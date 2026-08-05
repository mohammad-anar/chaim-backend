import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { OfferController } from "./offer.controller.js";
import { OfferValidation } from "./offer.validation.js";

const router = express.Router();

router.post(
  "/",
  auth(),
  validateRequest(OfferValidation.createOfferZodSchema),
  OfferController.createOffer,
);

router.get("/my-offers", auth(), OfferController.getMyOffers);

router.patch(
  "/status/:id",
  auth(),
  validateRequest(OfferValidation.updateOfferStatusZodSchema),
  OfferController.updateOfferStatus,
);

export const OfferRoutes = router;
