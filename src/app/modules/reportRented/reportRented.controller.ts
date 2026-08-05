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

export const ReportRentedController = {
  createReportRentedIntent,
  getMyReportedRented,
};
