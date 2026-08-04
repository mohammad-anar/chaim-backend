import express from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth.js";
import fileUploadHandler from "../../middlewares/fileUploadHandler.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { ApartmentController } from "./apartment.controller.js";
import { ApartmentValidation } from "./apartment.validation.js";

const router = express.Router();

router.post(
  "/",
  auth(),
  fileUploadHandler(),
  validateRequest(ApartmentValidation.createApartmentZodSchema),
  ApartmentController.createApartment,
);

router.get(
  "/my-apartment",
  auth(),
  ApartmentController.getMyAppartment,
);

router.get(
  "/",
  ApartmentController.getAllApartments,
);

router.get(
  "/:id",
  ApartmentController.getApartmentById,
);

router.patch(
  "/status/:id",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(ApartmentValidation.updateApartmentStatusZodSchema),
  ApartmentController.updateApartmentStatus,
);

router.patch(
  "/:id",
  auth(),
  fileUploadHandler(),
  validateRequest(ApartmentValidation.updateApartmentZodSchema),
  ApartmentController.updateApartment,
);

router.delete(
  "/:id",
  auth(),
  ApartmentController.deleteApartment,
);

export const ApartmentRoutes = router;
