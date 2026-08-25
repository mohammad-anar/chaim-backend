import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { CallLogController } from "./callLog.controller.js";
import { CallLogValidation } from "./callLog.validation.js";

import { UserRole } from "@prisma/client";

const router = express.Router();

router.post(
  "/initiate",
  auth(),
  validateRequest(CallLogValidation.initiateCallZodSchema),
  CallLogController.initiateCall,
);

router.post(
  "/initiate-whatsapp",
  auth(),
  validateRequest(CallLogValidation.initiateWhatsAppZodSchema),
  CallLogController.initiateWhatsApp,
);

router.get("/twiml", CallLogController.renderTwiML);

router.post("/status-webhook", express.urlencoded({ extended: false }), CallLogController.handleTwilioStatusWebhook);

router.get("/my-logs", auth(), CallLogController.getMyCallLogs);

// Admin: View all platform call logs
router.get("/admin/all", auth(UserRole.SUPER_ADMIN), CallLogController.getAllCallLogsAdmin);

export const CallLogRoutes = router;
