import express from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { MarketingPlatformController } from "./marketingPlatform.controller.js";
import { MarketingPlatformValidation } from "./marketingPlatform.validation.js";

const router = express.Router();

// Public: Get active marketing platforms (for registration/dropdown)
router.get("/active", MarketingPlatformController.getActiveMarketingPlatforms);

// Public / Admin: Get all marketing platforms with preference counts & pagination
router.get("/", MarketingPlatformController.getAllMarketingPlatforms);

// Public / Admin: Get single marketing platform by ID
router.get("/:id", MarketingPlatformController.getMarketingPlatformById);

// Admin: Create marketing platform
router.post(
  "/",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(MarketingPlatformValidation.createMarketingPlatformZodSchema),
  MarketingPlatformController.createMarketingPlatform,
);

// Admin: Update marketing platform
router.patch(
  "/:id",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(MarketingPlatformValidation.updateMarketingPlatformZodSchema),
  MarketingPlatformController.updateMarketingPlatform,
);

// Admin: Delete marketing platform
router.delete(
  "/:id",
  auth(UserRole.SUPER_ADMIN),
  MarketingPlatformController.deleteMarketingPlatform,
);

export const MarketingPlatformRoutes = router;
