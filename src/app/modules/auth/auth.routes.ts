import express from "express";
import auth from "../../middlewares/auth.js";
import fileUploadHandler from "../../middlewares/fileUploadHandler.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { AuthController } from "./auth.controller.js";
import { AuthValidation } from "./auth.validation.js";

const router = express.Router();

router.post(
  "/register",
  fileUploadHandler(),
  validateRequest(AuthValidation.registerZodSchema),
  AuthController.registerUser,
);

router.post(
  "/login",
  validateRequest(AuthValidation.loginZodSchema),
  AuthController.loginUser,
);

router.post(
  "/refresh-token",
  validateRequest(AuthValidation.refreshTokenZodSchema),
  AuthController.refreshToken,
);

router.post(
  "/change-password",
  auth(),
  validateRequest(AuthValidation.changePasswordZodSchema),
  AuthController.changePassword,
);

router.post(
  "/forgot-password",
  validateRequest(AuthValidation.forgotPasswordZodSchema),
  AuthController.forgotPassword,
);

router.post(
  "/verify-otp",
  validateRequest(AuthValidation.verifyOtpZodSchema),
  AuthController.verifyOtp,
);

router.post(
  "/reset-password",
  validateRequest(AuthValidation.resetPasswordZodSchema),
  AuthController.resetPassword,
);

export const AuthRoutes = router;
