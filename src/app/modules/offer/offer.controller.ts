import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { OfferServices } from "./offer.service.js";

const createOffer = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await OfferServices.createOffer(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Custom offer submitted successfully",
    data: result,
  });
});

const getMyOffers = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await OfferServices.getMyOffers(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Offers retrieved successfully",
    data: result,
  });
});

const updateOfferStatus = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const id = req.params.id as string;
  const { status } = req.body;

  const result = await OfferServices.updateOfferStatus(userId, id, status);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Offer ${status.toLowerCase()} successfully`,
    data: result,
  });
});

export const OfferController = {
  createOffer,
  getMyOffers,
  updateOfferStatus,
};
