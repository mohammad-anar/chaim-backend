import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { ApartmentAvailabilityServices } from "./apartmentAvailability.service.js";

const addAvailability = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await ApartmentAvailabilityServices.addAvailability(userId, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Weekend availability added successfully",
    data: result,
  });
});

const removeAvailability = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await ApartmentAvailabilityServices.removeAvailability(userId, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Weekend availability removed successfully",
    data: result,
  });
});

const bulkSetAvailability = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await ApartmentAvailabilityServices.bulkSetAvailability(userId, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Apartment availabilities updated successfully",
    data: result,
  });
});

const getApartmentAvailabilities = catchAsync(async (req: Request, res: Response) => {
  const { apartmentId } = req.params;
  const result = await ApartmentAvailabilityServices.getApartmentAvailabilities(apartmentId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Apartment availabilities retrieved successfully",
    data: result,
  });
});

export const ApartmentAvailabilityController = {
  addAvailability,
  removeAvailability,
  bulkSetAvailability,
  getApartmentAvailabilities,
};
