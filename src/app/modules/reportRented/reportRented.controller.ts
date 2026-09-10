import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { ReportRentedServices } from "./reportRented.service.js";

const createReportRentedIntent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await ReportRentedServices.createReportRentedIntent(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Report rented payment intent created successfully for 50 ILS fee",
    data: result,
  });
});

const getMyReportedRented = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await ReportRentedServices.getMyReportedRented(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Reported rented history retrieved successfully",
    data: result,
  });
});

const getReportRentedStats = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await ReportRentedServices.getReportRentedStats(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Report rented statistics retrieved successfully",
    data: result,
  });
});

const getMyReportRentedDues = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await ReportRentedServices.getMyReportRentedDues(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Unpaid report rented dues retrieved successfully",
    data: result,
  });
});

const paySingleReportRented = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { id } = req.params;
  const result = await ReportRentedServices.paySingleReportRented(userId, id as string, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const payAllReportRentedDues = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await ReportRentedServices.payAllReportRentedDues(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const getAllReportRentedAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportRentedServices.getAllReportRentedAdmin();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All reported rented records retrieved successfully",
    data: result,
  });
});

const markReportAsPaidAdmin = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ReportRentedServices.markReportAsPaidAdmin(id as string);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

export const ReportRentedController = {
  createReportRentedIntent,
  getMyReportedRented,
  getReportRentedStats,
  getMyReportRentedDues,
  paySingleReportRented,
  payAllReportRentedDues,
  getAllReportRentedAdmin,
  markReportAsPaidAdmin,
};
