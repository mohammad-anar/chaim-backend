import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import twilio from "twilio";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { CallLogServices } from "./callLog.service.js";

const initiateCall = catchAsync(async (req: Request, res: Response) => {
  const callerId = req.user.id;
  const result = await CallLogServices.initiateCall(callerId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Call initiated successfully",
    data: result,
  });
});

const renderTwiML = (req: Request, res: Response) => {
  const targetPhone = req.query.to as string;
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  if (targetPhone) {
    const dial = twiml.dial({ callerId: process.env.TWILIO_PHONE_NUMBER });
    dial.number(targetPhone);
  } else {
    twiml.say("Sorry, target phone number was not provided.");
  }

  res.type("text/xml");
  res.send(twiml.toString());
};

const handleTwilioStatusWebhook = catchAsync(async (req: Request, res: Response) => {
  await CallLogServices.handleTwilioStatusWebhook(req.body);
  res.status(StatusCodes.OK).send("Webhook received");
});

const getMyCallLogs = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await CallLogServices.getMyCallLogs(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Call logs retrieved successfully",
    data: result,
  });
});

export const CallLogController = {
  initiateCall,
  renderTwiML,
  handleTwilioStatusWebhook,
  getMyCallLogs,
};
