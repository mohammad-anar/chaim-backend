import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { AmbassadorService } from "./ambassador.service.js";

// ==========================================
// AMBASSADOR PORTAL CONTROLLERS
// ==========================================

const registerAmbassador = catchAsync(async (req: Request, res: Response) => {
  const result = await AmbassadorService.registerAmbassador(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Ambassador application submitted successfully. Pending Admin review.",
    data: result,
  });
});

const loginAmbassador = catchAsync(async (req: Request, res: Response) => {
  const result = await AmbassadorService.loginAmbassador(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ambassador logged in successfully",
    data: result,
  });
});

const getAmbassadorProfile = catchAsync(async (req: Request, res: Response) => {
  const ambassadorId = req.user.id;
  const result = await AmbassadorService.getAmbassadorProfile(ambassadorId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ambassador profile retrieved successfully",
    data: result,
  });
});

const updateAmbassadorSettings = catchAsync(async (req: Request, res: Response) => {
  const ambassadorId = req.user.id;
  const result = await AmbassadorService.updateAmbassadorSettings(ambassadorId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ambassador settings updated successfully",
    data: result,
  });
});

const getAttributedApartments = catchAsync(async (req: Request, res: Response) => {
  const ambassadorId = req.user.id;
  const result = await AmbassadorService.getAttributedApartments(ambassadorId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Attributed apartments retrieved successfully",
    data: result,
  });
});

const selectAttributionModel = catchAsync(async (req: Request, res: Response) => {
  const ambassadorId = req.user.id;
  const result = await AmbassadorService.selectAttributionModel(ambassadorId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Commission model locked successfully",
    data: result,
  });
});

const manualClaimApartment = catchAsync(async (req: Request, res: Response) => {
  const ambassadorId = req.user.id;
  const result = await AmbassadorService.manualClaimApartment(ambassadorId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Apartment claimed successfully",
    data: result,
  });
});

const getAmbassadorCommissions = catchAsync(async (req: Request, res: Response) => {
  const ambassadorId = req.user.id;
  const result = await AmbassadorService.getAmbassadorCommissions(ambassadorId, {
    status: req.query.status as string,
    type: req.query.type as string,
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Commissions retrieved successfully",
    data: result,
  });
});

const getRecruitedSubAmbassadors = catchAsync(async (req: Request, res: Response) => {
  const ambassadorId = req.user.id;
  const result = await AmbassadorService.getRecruitedSubAmbassadors(ambassadorId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Recruited sub-ambassadors retrieved successfully",
    data: result,
  });
});

const requestPayout = catchAsync(async (req: Request, res: Response) => {
  const ambassadorId = req.user.id;
  const { amount } = req.body;
  const result = await AmbassadorService.requestPayout(ambassadorId, amount);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Payout request submitted successfully",
    data: result,
  });
});

const getAmbassadorPayouts = catchAsync(async (req: Request, res: Response) => {
  const ambassadorId = req.user.id;
  const result = await AmbassadorService.getAmbassadorPayouts(ambassadorId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Payout requests retrieved successfully",
    data: result,
  });
});

// ==========================================
// ADMIN CONTROL CENTER CONTROLLERS
// ==========================================

const getAdminStats = catchAsync(async (req: Request, res: Response) => {
  const result = await AmbassadorService.getAdminStats();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Admin ambassador stats retrieved successfully",
    data: result,
  });
});

const getAllAmbassadorsAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AmbassadorService.getAllAmbassadorsAdmin({
    status: req.query.status as string,
    search: req.query.search as string,
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All ambassadors retrieved successfully",
    data: result,
  });
});

const reviewAmbassadorApplication = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await AmbassadorService.reviewAmbassadorApplication(id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Ambassador application ${req.body.status.toLowerCase()} successfully`,
    data: result,
  });
});

const getAllAttributionsAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AmbassadorService.getAllAttributionsAdmin();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All attributions retrieved successfully",
    data: result,
  });
});

const adminRelinkAttribution = catchAsync(async (req: Request, res: Response) => {
  const result = await AmbassadorService.adminRelinkAttribution(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Attribution updated/relinked successfully",
    data: result,
  });
});

const getAllCommissionsAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AmbassadorService.getAllCommissionsAdmin();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All commissions retrieved successfully",
    data: result,
  });
});

const adminApproveFee = catchAsync(async (req: Request, res: Response) => {
  const result = await AmbassadorService.adminApproveFee(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Listing fee commission approved successfully",
    data: result,
  });
});

const adminReverseCommission = catchAsync(async (req: Request, res: Response) => {
  const result = await AmbassadorService.adminReverseCommission(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Commission reversed successfully",
    data: result,
  });
});

const getAllPayoutsAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AmbassadorService.getAllPayoutsAdmin();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All payout requests retrieved successfully",
    data: result,
  });
});

const adminProcessPayout = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await AmbassadorService.adminProcessPayout(id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Payout request processed as ${req.body.status.toLowerCase()} successfully`,
    data: result,
  });
});

const triggerDeadlineJob = catchAsync(async (req: Request, res: Response) => {
  const result = await AmbassadorService.processExpiredDeadlines();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `7-Day deadline runner executed. ${result.processedCount} expired attributions auto-assigned.`,
    data: result,
  });
});

export const AmbassadorController = {
  registerAmbassador,
  loginAmbassador,
  getAmbassadorProfile,
  updateAmbassadorSettings,
  getAttributedApartments,
  selectAttributionModel,
  manualClaimApartment,
  getAmbassadorCommissions,
  getRecruitedSubAmbassadors,
  requestPayout,
  getAmbassadorPayouts,
  getAdminStats,
  getAllAmbassadorsAdmin,
  reviewAmbassadorApplication,
  getAllAttributionsAdmin,
  adminRelinkAttribution,
  getAllCommissionsAdmin,
  adminApproveFee,
  adminReverseCommission,
  getAllPayoutsAdmin,
  adminProcessPayout,
  triggerDeadlineJob,
};
