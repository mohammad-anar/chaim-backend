import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { ContactController } from "./contact.controller.js";
import { ContactValidation } from "./contact.validation.js";

const router = express.Router();

router.post(
  "/",
  validateRequest(ContactValidation.createContactZodSchema),
  ContactController.createContact,
);

router.get("/", auth("SUPER_ADMIN"), ContactController.getAllContacts);

export const ContactRoutes = router;
