import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import pick from "../../../helpers/pick.js";
import sendResponse from "../../shared/sendResponse.js";
import { OwnerServices } from "./owner.service.js";

const getAllOwners = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, [
    "searchTerm",
    "hasDue",
    "status",
    "notificationPreference",
  ]);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const result = await OwnerServices.getAllOwners(filters as any, options as any);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Owners retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleOwner = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await OwnerServices.getSingleOwner(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Owner details retrieved successfully",
    data: result,
  });
});

const sendAvailabilityReminder = catchAsync(
  async (req: Request, res: Response) => {
    const adminId = req.user.id;
    const ownerId = req.params.id as string;
    const result = await OwnerServices.sendAvailabilityReminder(
      adminId,
      ownerId,
      req.body,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: result.message,
      data: result,
    });
  },
);

const sendPaymentDueReminder = catchAsync(
  async (req: Request, res: Response) => {
    const adminId = req.user.id;
    const ownerId = req.params.id as string;
    const result = await OwnerServices.sendPaymentDueReminder(
      adminId,
      ownerId,
      req.body,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: result.message,
      data: result,
    });
  },
);

export const OwnerController = {
  getAllOwners,
  getSingleOwner,
  sendAvailabilityReminder,
  sendPaymentDueReminder,
};
