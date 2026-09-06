import { UserRole } from "@prisma/client";
import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { SwapController } from "./swap.controller.js";
import { SwapValidation } from "./swap.validation.js";

const router = express.Router();

// Admin Swap Routes
router.get(
  "/admin/all",
  auth(UserRole.SUPER_ADMIN),
  SwapController.getAllSwapsAdmin,
);

router.patch(
  "/admin/status/:id",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(SwapValidation.updateSwapStatusZodSchema),
  SwapController.updateSwapStatusAdmin,
);

router.post(
  "/request",
  auth(),
  validateRequest(SwapValidation.createSwapRequestZodSchema),
  SwapController.createSwapRequest,
);

router.get("/my-swaps", auth(), SwapController.getMySwaps);

router.patch(
  "/status/:id",
  auth(),
  validateRequest(SwapValidation.updateSwapStatusZodSchema),
  SwapController.updateSwapStatus,
);

export const SwapRoutes = router;
