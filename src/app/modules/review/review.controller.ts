import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { ReviewServices } from "./review.service.js";

const createReview = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await ReviewServices.createReview(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Review created successfully",
    data: result,
  });
});

const getApartmentReviews = catchAsync(async (req: Request, res: Response) => {
  const apartmentId = req.params.apartmentId as string;
  const result = await ReviewServices.getApartmentReviews(apartmentId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Apartment reviews retrieved successfully",
    data: result,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const id = req.params.id as string;
  const isAdmin = req.user?.role === "SUPER_ADMIN";

  const result = await ReviewServices.deleteReview(userId, id, isAdmin);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const getAllReviewsAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewServices.getAllReviewsAdmin(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Admin reviews retrieved successfully",
    data: result,
  });
});

const updateReviewStatusAdmin = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;
  const result = await ReviewServices.updateReviewStatusAdmin(id, status);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Review status updated successfully",
    data: result,
  });
});

export const ReviewController = {
  createReview,
  getApartmentReviews,
  deleteReview,
  getAllReviewsAdmin,
  updateReviewStatusAdmin,
};
