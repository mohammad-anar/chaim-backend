import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { AdminServices } from "./admin.service.js";

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminServices.getDashboardStats();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Admin dashboard stats retrieved successfully",
    data: result,
  });
});

const getMonthlyRevenue = catchAsync(async (req: Request, res: Response) => {
  const year = req.query.year ? Number(req.query.year) : undefined;
  const month = req.query.month ? Number(req.query.month) : undefined;

  const result = await AdminServices.getMonthlyRevenue(year, month);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Monthly revenue breakdown retrieved successfully",
    data: result,
  });
});

const getCitySearchDemand = catchAsync(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const year = req.query.year ? Number(req.query.year) : undefined;
  const month = req.query.month ? Number(req.query.month) : undefined;

  const result = await AdminServices.getCitySearchDemand(limit, year, month);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "City search demand data retrieved successfully",
    data: result,
  });
});

const getRecentActivity = catchAsync(async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const type = req.query.type as string | undefined;

  const result = await AdminServices.getRecentActivity({ page, limit, type });
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Recent activities retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAmbassadorOverview = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminServices.getAmbassadorOverview();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ambassador overview stats retrieved successfully",
    data: result,
  });
});

const getAllCallLogs = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminServices.getAllCallLogs();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All call logs retrieved successfully",
    data: result,
  });
});

export const AdminController = {
  getDashboardStats,
  getMonthlyRevenue,
  getCitySearchDemand,
  getRecentActivity,
  getAmbassadorOverview,
  getAllCallLogs,
};
