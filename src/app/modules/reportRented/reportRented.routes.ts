import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { ReportRentedController } from "./reportRented.controller.js";
import { ReportRentedValidation } from "./reportRented.validation.js";

const router = express.Router();

router.post(
  "/create-intent",
  auth(),
  validateRequest(ReportRentedValidation.createReportRentedIntentZodSchema),
  ReportRentedController.createReportRentedIntent,
);

router.get("/my-reports", auth(), ReportRentedController.getMyReportedRented);

export const ReportRentedRoutes = router;
