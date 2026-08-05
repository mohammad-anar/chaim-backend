import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import { getMultipleFilesPath, getSingleFilePath } from "../../shared/getFilePath.js";
import pick from "../../../helpers/pick.js";
import sendResponse from "../../shared/sendResponse.js";
import { ApartmentServices } from "./apartment.service.js";

const createApartment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;

  const coverImage = getSingleFilePath(req.files, "image");
  const images = getMultipleFilesPath(req.files, "image");

  const payload = {
    ...req.body,
    ...(coverImage && { coverImage }),
    ...(images && images.length > 0 && { images }),
  };

  const result = await ApartmentServices.createApartment(userId, payload);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Apartment listed successfully. Payment is pending.",
    data: result,
  });
});

const getMyAppartment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await ApartmentServices.getMyAppartment(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User apartment retrieved successfully",
    data: result,
  });
});

const getAllApartments = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, [
    "searchTerm",
    "city",
    "neighborhood",
    "propertyType",
    "minPrice",
    "maxPrice",
    "bedrooms",
    "bathrooms",
    "maxGuest",
    "guestCount",
    "weekendId",
    "amenities",
    "maxWalkingMinutes",
    "status",
  ]);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const isUserAdmin = req.user?.role === "SUPER_ADMIN";

  const result = await ApartmentServices.getAllApartments(
    filters as any,
    options as any,
    isUserAdmin,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Apartments retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getApartmentById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await ApartmentServices.getApartmentById(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Apartment retrieved successfully",
    data: result,
  });
});

const updateApartment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const id = req.params.id as string;

  const coverImage = getSingleFilePath(req.files, "image");
  const newImages = getMultipleFilesPath(req.files, "image");

  const payload = {
    ...req.body,
    ...(coverImage && { coverImage }),
    ...(newImages && newImages.length > 0 && { images: newImages }),
  };

  const result = await ApartmentServices.updateApartment(userId, id, payload);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Apartment updated successfully",
    data: result,
  });
});

const updateApartmentStatus = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;
  const result = await ApartmentServices.updateApartmentStatus(id, status);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Apartment status updated successfully",
    data: result,
  });
});

const deleteApartment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const id = req.params.id as string;
  const isUserAdmin = req.user?.role === "SUPER_ADMIN";

  const result = await ApartmentServices.deleteApartment(userId, id, isUserAdmin);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Apartment deleted successfully",
    data: result,
  });
});

export const ApartmentController = {
  createApartment,
  getMyAppartment,
  getAllApartments,
  getApartmentById,
  updateApartment,
  updateApartmentStatus,
  deleteApartment,
};
