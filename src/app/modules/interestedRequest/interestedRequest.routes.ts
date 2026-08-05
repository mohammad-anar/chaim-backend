import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { InterestedRequestController } from "./interestedRequest.controller.js";
import { InterestedRequestValidation } from "./interestedRequest.validation.js";

const router = express.Router();

router.post(
  "/",
  auth(),
  validateRequest(InterestedRequestValidation.createInterestedRequestZodSchema),
  InterestedRequestController.createInterestedRequest,
);

router.get("/my-requests", auth(), InterestedRequestController.getMyInterestedRequests);

export const InterestedRequestRoutes = router;
