import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { WishlistServices } from "./wishlist.service.js";

const toggleWishlist = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { apartmentId } = req.body;
  const result = await WishlistServices.toggleWishlist(userId, apartmentId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result.data || null,
  });
});

const getMyWishlist = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await WishlistServices.getMyWishlist(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Wishlist retrieved successfully",
    data: result,
  });
});

export const WishlistController = {
  toggleWishlist,
  getMyWishlist,
};
