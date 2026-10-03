import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import { getSingleFilePath } from "../../shared/getFilePath.js";
import sendResponse from "../../shared/sendResponse.js";
import { AdvertisementService } from "./advertisement.service.js";

const createAdvertisement = catchAsync(async (req: Request, res: Response) => {
  const uploadedImage =
    getSingleFilePath(req.files, "image") ||
    getSingleFilePath((req as any).file ? { image: [(req as any).file] } : undefined, "image");

  const imageString =
    typeof req.body.image === "string" && req.body.image.trim() !== ""
      ? req.body.image
      : undefined;

  const finalImage = uploadedImage || imageString;

  const payload = {
    ...req.body,
    ...(finalImage && { image: finalImage }),
  };

  const result = await AdvertisementService.createAdvertisement(payload);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Advertisement created successfully",
    data: result,
  });
});

const getAllAdvertisements = catchAsync(async (req: Request, res: Response) => {
  const result = await AdvertisementService.getAllAdvertisements(req.query as any);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Advertisements retrieved successfully",
    data: result,
  });
});

const getAdvertisementById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await AdvertisementService.getAdvertisementById(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Advertisement retrieved successfully",
    data: result,
  });
});

const recordClick = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await AdvertisementService.recordClick(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Click recorded successfully",
    data: result,
  });
});

const updateAdvertisement = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const uploadedImage =
    getSingleFilePath(req.files, "image") ||
    getSingleFilePath((req as any).file ? { image: [(req as any).file] } : undefined, "image");

  const imageString =
    typeof req.body.image === "string" && req.body.image.trim() !== ""
      ? req.body.image
      : undefined;

  const finalImage = uploadedImage || imageString;

  const payload = {
    ...req.body,
    ...(finalImage && { image: finalImage }),
  };

  const result = await AdvertisementService.updateAdvertisement(id, payload);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Advertisement updated successfully",
    data: result,
  });
});

const deleteAdvertisement = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await AdvertisementService.deleteAdvertisement(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Advertisement deleted successfully",
    data: result,
  });
});

export const AdvertisementController = {
  createAdvertisement,
  getAllAdvertisements,
  getAdvertisementById,
  recordClick,
  updateAdvertisement,
  deleteAdvertisement,
};
