import express from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { AdvertisementController } from "./advertisement.controller.js";
import { AdvertisementValidation } from "./advertisement.validation.js";

const router = express.Router();

// Public: View active advertisements
router.get("/", AdvertisementController.getAllAdvertisements);

// Public: View single ad
router.get("/:id", AdvertisementController.getAdvertisementById);

// Public: Track click
router.post("/:id/click", AdvertisementController.recordClick);

// Admin: Create advertisement
router.post(
  "/",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(AdvertisementValidation.createAdvertisementZodSchema),
  AdvertisementController.createAdvertisement,
);

// Admin: Update advertisement
router.patch(
  "/:id",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(AdvertisementValidation.updateAdvertisementZodSchema),
  AdvertisementController.updateAdvertisement,
);

// Admin: Delete advertisement
router.delete(
  "/:id",
  auth(UserRole.SUPER_ADMIN),
  AdvertisementController.deleteAdvertisement,
);

export const AdvertisementRoutes = router;
