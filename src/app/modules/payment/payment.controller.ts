import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { PaymentServices } from "./payment.service.js";

const createListingPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { apartmentId } = req.body;
  const result = await PaymentServices.createListingPaymentIntent(userId, apartmentId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Listing Nedarim payment intent created successfully",
    data: result,
  });
});

const createSwapPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { swapId } = req.body;
  const result = await PaymentServices.createSwapPaymentIntent(userId, swapId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Swap Nedarim payment intent created successfully",
    data: result,
  });
});

const createReportRentedPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await PaymentServices.createReportRentedPaymentIntent(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Report rented Nedarim payment intent created successfully",
    data: result,
  });
});

const verifyNedarimPayment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await PaymentServices.verifyAndConfirmNedarimPayment(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const handleNedarimCallback = catchAsync(async (req: Request, res: Response) => {
  const payload = {
    ...req.query,
    ...req.body,
  };

  const result = await PaymentServices.handleNedarimCallback(payload);

  res.status(StatusCodes.OK).send("OK");
});

export const PaymentController = {
  createListingPaymentIntent,
  createSwapPaymentIntent,
  createReportRentedPaymentIntent,
  verifyNedarimPayment,
  handleNedarimCallback,
};
