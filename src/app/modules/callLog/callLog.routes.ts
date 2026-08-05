import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { CallLogController } from "./callLog.controller.js";
import { CallLogValidation } from "./callLog.validation.js";

const router = express.Router();

router.post(
  "/initiate",
  auth(),
  validateRequest(CallLogValidation.initiateCallZodSchema),
  CallLogController.initiateCall,
);

router.get("/twiml", CallLogController.renderTwiML);

router.post("/status-webhook", express.urlencoded({ extended: false }), CallLogController.handleTwilioStatusWebhook);

router.get("/my-logs", auth(), CallLogController.getMyCallLogs);

export const CallLogRoutes = router;
