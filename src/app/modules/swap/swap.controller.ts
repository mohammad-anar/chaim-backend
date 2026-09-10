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

const getAllSwapsAdmin = catchAsync(async (req: Request, res: Response) => {
  const filters = {
    status: req.query.status as any,
    searchTerm: req.query.searchTerm as string | undefined,
    city: req.query.city as string | undefined,
    neighborhood: req.query.neighborhood as string | undefined,
    destLat: req.query.destLat as string | undefined,
    destLng: req.query.destLng as string | undefined,
    walkingMinutes: req.query.walkingMinutes as string | undefined,
  };
  const options = {
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as any,
  };

  const result = await SwapServices.getAllSwapsAdmin(filters, options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All swap requests retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const updateSwapStatusAdmin = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;

  const result = await SwapServices.updateSwapStatusAdmin(id, status);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Swap request status updated to ${status} successfully`,
    data: result,
  });
});

export const SwapController = {
  createSwapRequest,
  getMySwaps,
  updateSwapStatus,
  getAllSwapsAdmin,
  updateSwapStatusAdmin,
};
