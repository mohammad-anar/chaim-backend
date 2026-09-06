import express from "express";
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
  auth("AMBASSADOR", "SUPER_ADMIN"),
  AmbassadorController.getAmbassadorProfile,
);

router.patch(
  "/profile/settings",
  auth("AMBASSADOR", "SUPER_ADMIN"),
  validateRequest(AmbassadorValidation.updateSettingsZodSchema),
  AmbassadorController.updateAmbassadorSettings,
);

router.get(
  "/referral-link",
  auth("AMBASSADOR", "SUPER_ADMIN"),
  AmbassadorController.getAmbassadorReferralLink,
);

router.get(
  "/attributions",
  auth("AMBASSADOR", "SUPER_ADMIN"),
  AmbassadorController.getAttributedApartments,
);

router.post(
  "/attributions/select-model",
  auth("AMBASSADOR", "SUPER_ADMIN"),
  validateRequest(AmbassadorValidation.selectAttributionModelZodSchema),
  AmbassadorController.selectAttributionModel,
);

router.post(
  "/attributions/manual-claim",
  auth("AMBASSADOR", "SUPER_ADMIN"),
  validateRequest(AmbassadorValidation.manualClaimApartmentZodSchema),
  AmbassadorController.manualClaimApartment,
);

router.get(
  "/commissions",
  auth("AMBASSADOR", "SUPER_ADMIN"),
  AmbassadorController.getAmbassadorCommissions,
);

router.get(
  "/sub-ambassadors",
  auth("AMBASSADOR", "SUPER_ADMIN"),
  AmbassadorController.getRecruitedSubAmbassadors,
);

router.post(
  "/payouts/request",
  auth("AMBASSADOR", "SUPER_ADMIN"),
  validateRequest(AmbassadorValidation.requestPayoutZodSchema),
  AmbassadorController.requestPayout,
);

router.get(
  "/payouts",
  auth("AMBASSADOR", "SUPER_ADMIN"),
  AmbassadorController.getAmbassadorPayouts,
);

// ==========================================
// ADMIN CONTROL CENTER ENDPOINTS (SUPER_ADMIN ONLY)
// ==========================================

router.get(
  "/admin/stats",
  auth("SUPER_ADMIN"),
  AmbassadorController.getAdminStats,
);

router.get(
  "/admin/ambassadors",
  auth("SUPER_ADMIN"),
  AmbassadorController.getAllAmbassadorsAdmin,
);

router.patch(
  "/admin/applications/:id/review",
  auth("SUPER_ADMIN"),
  validateRequest(AmbassadorValidation.adminReviewApplicationZodSchema),
  AmbassadorController.reviewAmbassadorApplication,
);

router.patch(
  "/admin/status/:id",
  auth("SUPER_ADMIN"),
  validateRequest(AmbassadorValidation.adminReviewApplicationZodSchema),
  AmbassadorController.reviewAmbassadorApplication,
);

router.get(
  "/admin/attributions",
  auth("SUPER_ADMIN"),
  AmbassadorController.getAllAttributionsAdmin,
);

router.patch(
  "/admin/attributions/relink",
  auth("SUPER_ADMIN"),
  validateRequest(AmbassadorValidation.adminRelinkAttributionZodSchema),
  AmbassadorController.adminRelinkAttribution,
);

router.get(
  "/admin/commissions",
  auth("SUPER_ADMIN"),
  AmbassadorController.getAllCommissionsAdmin,
);

router.post(
  "/admin/commissions/approve-fee",
  auth("SUPER_ADMIN"),
  validateRequest(AmbassadorValidation.adminApproveFeeZodSchema),
  AmbassadorController.adminApproveFee,
);

router.post(
  "/admin/commissions/reverse",
  auth("SUPER_ADMIN"),
  validateRequest(AmbassadorValidation.adminReverseCommissionZodSchema),
  AmbassadorController.adminReverseCommission,
);

router.get(
  "/admin/payouts",
  auth("SUPER_ADMIN"),
  AmbassadorController.getAllPayoutsAdmin,
);

router.patch(
  "/admin/payouts/:id/process",
  auth("SUPER_ADMIN"),
  validateRequest(AmbassadorValidation.adminProcessPayoutZodSchema),
  AmbassadorController.adminProcessPayout,
);

router.post(
  "/admin/cron/trigger-deadline-check",
  auth("SUPER_ADMIN"),
  AmbassadorController.triggerDeadlineJob,
);

export const AmbassadorRoutes = router;
