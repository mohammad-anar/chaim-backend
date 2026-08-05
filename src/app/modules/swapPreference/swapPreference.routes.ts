import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { SwapPreferenceController } from "./swapPreference.controller.js";
import { SwapPreferenceValidation } from "./swapPreference.validation.js";

const router = express.Router();

router.post(
  "/",
  auth(),
  validateRequest(SwapPreferenceValidation.createOrUpdateSwapPreferenceZodSchema),
  SwapPreferenceController.createOrUpdateSwapPreference,
);

router.get("/my-preference", auth(), SwapPreferenceController.getMySwapPreference);

router.get("/matched-swaps", auth(), SwapPreferenceController.getMatchedSwapableProperties);

router.get("/all", SwapPreferenceController.getAllSwapPreferences);

export const SwapPreferenceRoutes = router;
