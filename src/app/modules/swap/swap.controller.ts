import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { SwapServices } from "./swap.service.js";

const createSwapRequest = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await SwapServices.createSwapRequest(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Swap request sent successfully",
    data: result,
  });
});

const getMySwaps = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await SwapServices.getMySwaps(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User swap requests retrieved successfully",
    data: result,
  });
});

const updateSwapStatus = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const id = req.params.id as string;
  const { status } = req.body;

  const result = await SwapServices.updateSwapStatus(userId, id, status);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Swap request ${status.toLowerCase()} successfully`,
    data: result,
  });
});

export const SwapController = {
  createSwapRequest,
  getMySwaps,
  updateSwapStatus,
};
