import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { ContactServices } from "./contact.service.js";

const createContact = catchAsync(async (req: Request, res: Response) => {
  const result = await ContactServices.createContact(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Thank you for contacting us. Your message has been sent successfully.",
    data: result,
  });
});

const getAllContacts = catchAsync(async (req: Request, res: Response) => {
  const result = await ContactServices.getAllContacts();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Contact messages retrieved successfully",
    data: result,
  });
});

export const ContactController = {
  createContact,
  getAllContacts,
};
