import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { NotifyRequestServices } from "./notifyRequest.service.js";

const createNotifyRequest = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await NotifyRequestServices.createNotifyRequest(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Notify Me request submitted successfully",
    data: result,
  });
});

const getMyNotifyRequests = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await NotifyRequestServices.getMyNotifyRequests(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Notify requests retrieved successfully",
    data: result,
  });
});

export const NotifyRequestController = {
  createNotifyRequest,
  getMyNotifyRequests,
};
