import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { WishlistController } from "./wishlist.controller.js";
import { WishlistValidation } from "./wishlist.validation.js";

const router = express.Router();

router.post(
  "/toggle",
  auth(),
  validateRequest(WishlistValidation.toggleWishlistZodSchema),
  WishlistController.toggleWishlist,
);

router.get("/my-wishlist", auth(), WishlistController.getMyWishlist);

export const WishlistRoutes = router;
