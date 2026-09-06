import { UserRole } from "@prisma/client";
import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { AdminController } from "./admin.controller.js";
import { AdminValidation } from "./admin.validation.js";

const router = express.Router();

router.get(
  "/dashboard/stats",
  auth(UserRole.SUPER_ADMIN),
  AdminController.getDashboardStats,
);

router.get(
  "/dashboard/monthly-revenue",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(AdminValidation.getMonthlyRevenueQueryZodSchema),
  AdminController.getMonthlyRevenue,
);

router.get(
  "/dashboard/city-search-demand",
  auth(UserRole.SUPER_ADMIN),
  AdminController.getCitySearchDemand,
);

router.get(
  "/dashboard/recent-activity",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(AdminValidation.getRecentActivityQueryZodSchema),
  AdminController.getRecentActivity,
);

router.get(
  "/dashboard/ambassador-overview",
  auth(UserRole.SUPER_ADMIN),
  AdminController.getAmbassadorOverview,
);

router.get(
  "/call-logs",
  auth(UserRole.SUPER_ADMIN),
  AdminController.getAllCallLogs,
);

export const AdminRoutes = router;
