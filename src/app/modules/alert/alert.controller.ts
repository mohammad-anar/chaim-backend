import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { AlertService } from "./alert.service.js";

const createAlert = catchAsync(async (req: Request, res: Response) => {
  const result = await AlertService.createAlert(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Alert created and broadcasted successfully",
    data: result,
  });
});

const getAllAlerts = catchAsync(async (req: Request, res: Response) => {
  const result = await AlertService.getAllAlerts(req.query as any);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Alerts retrieved successfully",
    data: result,
  });
});

const getMyAlerts = catchAsync(async (req: Request, res: Response) => {
  const role = (req as any).user?.role;
  const userId = (req as any).user?.id;
  const result = await AlertService.getActiveAlertsForUser(role, userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Active alerts retrieved successfully",
    data: result,
  });
});

const updateAlert = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await AlertService.updateAlert(id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Alert updated successfully",
    data: result,
  });
});

const deleteAlert = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await AlertService.deleteAlert(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Alert deleted successfully",
    data: result,
  });
});

export const AlertController = {
  createAlert,
  getAllAlerts,
  getMyAlerts,
  updateAlert,
  deleteAlert,
};
