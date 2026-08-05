import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { ReviewController } from "./review.controller.js";
import { ReviewValidation } from "./review.validation.js";

const router = express.Router();

router.post(
  "/",
  auth(),
  validateRequest(ReviewValidation.createReviewZodSchema),
  ReviewController.createReview,
);

router.get("/apartment/:apartmentId", ReviewController.getApartmentReviews);

router.delete("/:id", auth(), ReviewController.deleteReview);

export const ReviewRoutes = router;
