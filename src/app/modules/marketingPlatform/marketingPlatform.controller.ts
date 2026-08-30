import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import pick from "../../../helpers/pick.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { MarketingPlatformService } from "./marketingPlatform.service.js";

const createMarketingPlatform = catchAsync(
  async (req: Request, res: Response) => {
    const result = await MarketingPlatformService.createMarketingPlatform(
      req.body,
    );

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Marketing platform created successfully",
      data: result,
    });
  },
);

const getAllMarketingPlatforms = catchAsync(
  async (req: Request, res: Response) => {
    const filters = pick(req.query, ["searchTerm", "status", "platform"]);
    const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
    const result = await MarketingPlatformService.getAllMarketingPlatforms(
      filters as any,
      options as any,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Marketing platforms retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getActiveMarketingPlatforms = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await MarketingPlatformService.getActiveMarketingPlatforms();

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Active marketing platforms retrieved successfully",
      data: result,
    });
  },
);

const getMarketingPlatformById = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await MarketingPlatformService.getMarketingPlatformById(id);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Marketing platform retrieved successfully",
      data: result,
    });
  },
);

const updateMarketingPlatform = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await MarketingPlatformService.updateMarketingPlatform(
      id,
      req.body,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Marketing platform updated successfully",
      data: result,
    });
  },
);

const deleteMarketingPlatform = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await MarketingPlatformService.deleteMarketingPlatform(id);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Marketing platform deleted successfully",
      data: result,
    });
  },
);

export const MarketingPlatformController = {
  createMarketingPlatform,
  getAllMarketingPlatforms,
  getActiveMarketingPlatforms,
  getMarketingPlatformById,
  updateMarketingPlatform,
  deleteMarketingPlatform,
};
