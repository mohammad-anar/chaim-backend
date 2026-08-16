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
    message: "Listing PaymentIntent created successfully",
    data: result,
  });
});

const handleStripeWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;
  const result = await PaymentServices.handleStripeWebhook(signature, req.body);

  res.status(StatusCodes.OK).json(result);
});

const confirmPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const { paymentIntentId } = req.body;
  const result = await PaymentServices.verifyAndConfirmPaymentIntent(paymentIntentId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

export const PaymentController = {
  createListingPaymentIntent,
  handleStripeWebhook,
  confirmPaymentIntent,
};
