import express from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { NewsController } from "./news.controller.js";
import { NewsValidation } from "./news.validation.js";

const router = express.Router();

// Public: View all published news
router.get("/", NewsController.getAllNews);

// Public: View single article
router.get("/:id", NewsController.getNewsById);

// Admin: Create news
router.post(
  "/",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(NewsValidation.createNewsZodSchema),
  NewsController.createNews,
);

// Admin: Update news
router.patch(
  "/:id",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(NewsValidation.updateNewsZodSchema),
  NewsController.updateNews,
);

// Admin: Delete news
router.delete(
  "/:id",
  auth(UserRole.SUPER_ADMIN),
  NewsController.deleteNews,
);

export const NewsRoutes = router;
