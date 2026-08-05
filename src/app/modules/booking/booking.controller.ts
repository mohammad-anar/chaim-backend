import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { BookingServices } from "./booking.service.js";

const createBooking = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await BookingServices.createBooking(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Booking created successfully",
    data: result,
  });
});

const getMyBookings = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await BookingServices.getMyBookings(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User bookings retrieved successfully",
    data: result,
  });
});

const getApartmentBookings = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const apartmentId = req.params.apartmentId as string;
  const result = await BookingServices.getApartmentBookings(userId, apartmentId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Apartment bookings retrieved successfully",
    data: result,
  });
});

const cancelBooking = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const id = req.params.id as string;
  const result = await BookingServices.cancelBooking(userId, id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Booking cancelled successfully",
    data: result,
  });
});

export const BookingController = {
  createBooking,
  getMyBookings,
  getApartmentBookings,
  cancelBooking,
};
