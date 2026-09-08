import express from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth.js";
import fileUploadHandler from "../../middlewares/fileUploadHandler.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { UserController } from "./user.controller.js";
import { UserValidation } from "./user.validation.js";

const router = express.Router();

router.get(
  "/me",
  auth(),
  UserController.getMyProfile,
);

router.patch(
  "/update-me",
  auth(),
  fileUploadHandler(),
  validateRequest(UserValidation.updateProfileZodSchema),
  UserController.updateMyProfile,
);

router.get(
  "/admin/owners",
  auth(UserRole.SUPER_ADMIN),
  UserController.getAllOwnersAdmin,
);

router.post(
  "/admin/owners/:id/remind-payment",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(UserValidation.sendPaymentDueReminderZodSchema),
  UserController.sendPaymentDueReminder,
);

router.get(
  "/",
  auth(UserRole.SUPER_ADMIN),
  UserController.getAllUsers,
);

router.get(
  "/:id",
  auth(),
  UserController.getUserById,
);

router.patch(
  "/status/:id",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(UserValidation.updateUserStatusZodSchema),
  UserController.updateUserStatus,
);

router.delete(
  "/:id",
  auth(UserRole.SUPER_ADMIN),
  UserController.deleteUser,
);

export const UserRouter = router;
