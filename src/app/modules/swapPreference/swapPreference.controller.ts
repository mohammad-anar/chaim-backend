import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import pick from "../../../helpers/pick.js";
import sendResponse from "../../shared/sendResponse.js";
import { SwapPreferenceServices } from "./swapPreference.service.js";

const createOrUpdateSwapPreference = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await SwapPreferenceServices.createOrUpdateSwapPreference(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Swap preference saved successfully",
    data: result,
  });
});

const getMySwapPreference = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await SwapPreferenceServices.getMySwapPreference(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Swap preference retrieved successfully",
    data: result,
  });
});

const getAllSwapPreferences = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["city", "neighborhood", "rooms", "beds", "isEnabled"]);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);

  const result = await SwapPreferenceServices.getAllSwapPreferences(
    filters as any,
    options as any,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Swap preferences retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMatchedSwapableProperties = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await SwapPreferenceServices.getMatchedSwapableProperties(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Swappable properties retrieved and sorted by user preference",
    data: result,
  });
});

export const SwapPreferenceController = {
  createOrUpdateSwapPreference,
  getMySwapPreference,
  getAllSwapPreferences,
  getMatchedSwapableProperties,
};
