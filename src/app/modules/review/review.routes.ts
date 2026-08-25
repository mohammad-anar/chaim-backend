import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { ReviewController } from "./review.controller.js";
import { ReviewValidation } from "./review.validation.js";

import { UserRole } from "@prisma/client";

const router = express.Router();

router.post(
  "/",
  auth(),
  validateRequest(ReviewValidation.createReviewZodSchema),
  ReviewController.createReview,
);

router.get("/apartment/:apartmentId", ReviewController.getApartmentReviews);

// Admin: View all platform reviews
router.get("/admin/all", auth(UserRole.SUPER_ADMIN), ReviewController.getAllReviewsAdmin);

// Admin: Update review status (approve/reject)
router.patch("/status/:id", auth(UserRole.SUPER_ADMIN), ReviewController.updateReviewStatusAdmin);

router.delete("/:id", auth(), ReviewController.deleteReview);

export const ReviewRoutes = router;
