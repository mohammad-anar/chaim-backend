import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { NotifyRequestController } from "./notifyRequest.controller.js";
import { NotifyRequestValidation } from "./notifyRequest.validation.js";

const router = express.Router();

router.post(
  "/",
  auth(),
  validateRequest(NotifyRequestValidation.createNotifyRequestZodSchema),
  NotifyRequestController.createNotifyRequest,
);

router.get("/my-requests", auth(), NotifyRequestController.getMyNotifyRequests);

export const NotifyRequestRoutes = router;
