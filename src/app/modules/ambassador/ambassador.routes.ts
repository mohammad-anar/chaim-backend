import express from "express";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { AmbassadorController } from "./ambassador.controller.js";
import { AmbassadorValidation } from "./ambassador.validation.js";

const router = express.Router();

// ==========================================
// PUBLIC AMBASSADOR ENDPOINTS
// ==========================================

router.post(
  "/register",
  validateRequest(AmbassadorValidation.registerAmbassadorZodSchema),
  AmbassadorController.registerAmbassador,
);

router.post(
  "/login",
  validateRequest(AmbassadorValidation.loginAmbassadorZodSchema),
  AmbassadorController.loginAmbassador,
);

// ==========================================
// AMBASSADOR PORTAL ENDPOINTS (AMBASSADOR / SUPER_ADMIN)
// ==========================================

router.get(
  "/profile",
  auth(UserRole.AMBASSADOR, UserRole.SUPER_ADMIN),
  AmbassadorController.getAmbassadorProfile,
);

router.patch(
  "/profile/settings",
  auth(UserRole.AMBASSADOR, UserRole.SUPER_ADMIN),
  validateRequest(AmbassadorValidation.updateSettingsZodSchema),
  AmbassadorController.updateAmbassadorSettings,
);

router.get(
  "/attributions",
  auth(UserRole.AMBASSADOR, UserRole.SUPER_ADMIN),
  AmbassadorController.getAttributedApartments,
);

router.post(
  "/attributions/select-model",
  auth(UserRole.AMBASSADOR, UserRole.SUPER_ADMIN),
  validateRequest(AmbassadorValidation.selectAttributionModelZodSchema),
  AmbassadorController.selectAttributionModel,
);

router.post(
  "/attributions/manual-claim",
  auth(UserRole.AMBASSADOR, UserRole.SUPER_ADMIN),
  validateRequest(AmbassadorValidation.manualClaimApartmentZodSchema),
  AmbassadorController.manualClaimApartment,
);

router.get(
  "/commissions",
  auth(UserRole.AMBASSADOR, UserRole.SUPER_ADMIN),
  AmbassadorController.getAmbassadorCommissions,
);

router.get(
  "/sub-ambassadors",
  auth(UserRole.AMBASSADOR, UserRole.SUPER_ADMIN),
  AmbassadorController.getRecruitedSubAmbassadors,
);

router.post(
  "/payouts/request",
  auth(UserRole.AMBASSADOR, UserRole.SUPER_ADMIN),
  validateRequest(AmbassadorValidation.requestPayoutZodSchema),
  AmbassadorController.requestPayout,
);

router.get(
  "/payouts",
  auth(UserRole.AMBASSADOR, UserRole.SUPER_ADMIN),
  AmbassadorController.getAmbassadorPayouts,
);

// ==========================================
// ADMIN CONTROL CENTER ENDPOINTS (SUPER_ADMIN ONLY)
// ==========================================

router.get(
  "/admin/stats",
  auth(UserRole.SUPER_ADMIN),
  AmbassadorController.getAdminStats,
);

router.get(
  "/admin/ambassadors",
  auth(UserRole.SUPER_ADMIN),
  AmbassadorController.getAllAmbassadorsAdmin,
);

router.patch(
  "/admin/applications/:id/review",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(AmbassadorValidation.adminReviewApplicationZodSchema),
  AmbassadorController.reviewAmbassadorApplication,
);

router.get(
  "/admin/attributions",
  auth(UserRole.SUPER_ADMIN),
  AmbassadorController.getAllAttributionsAdmin,
);

router.patch(
  "/admin/attributions/relink",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(AmbassadorValidation.adminRelinkAttributionZodSchema),
  AmbassadorController.adminRelinkAttribution,
);

router.get(
  "/admin/commissions",
  auth(UserRole.SUPER_ADMIN),
  AmbassadorController.getAllCommissionsAdmin,
);

router.post(
  "/admin/commissions/approve-fee",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(AmbassadorValidation.adminApproveFeeZodSchema),
  AmbassadorController.adminApproveFee,
);

router.post(
  "/admin/commissions/reverse",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(AmbassadorValidation.adminReverseCommissionZodSchema),
  AmbassadorController.adminReverseCommission,
);

router.get(
  "/admin/payouts",
  auth(UserRole.SUPER_ADMIN),
  AmbassadorController.getAllPayoutsAdmin,
);

router.patch(
  "/admin/payouts/:id/process",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(AmbassadorValidation.adminProcessPayoutZodSchema),
  AmbassadorController.adminProcessPayout,
);

router.post(
  "/admin/cron/trigger-deadline-check",
  auth(UserRole.SUPER_ADMIN),
  AmbassadorController.triggerDeadlineJob,
);

export const AmbassadorRoutes = router;
