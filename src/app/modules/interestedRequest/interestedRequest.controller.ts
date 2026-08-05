import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { InterestedRequestServices } from "./interestedRequest.service.js";

const createInterestedRequest = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await InterestedRequestServices.createInterestedRequest(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Interested request sent successfully",
    data: result,
  });
});

const getMyInterestedRequests = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await InterestedRequestServices.getMyInterestedRequests(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Interested requests retrieved successfully",
    data: result,
  });
});

export const InterestedRequestController = {
  createInterestedRequest,
  getMyInterestedRequests,
};
