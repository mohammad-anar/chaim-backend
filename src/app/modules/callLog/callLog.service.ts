import twilio from "twilio";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { prisma } from "../../../helpers/prisma.js";
import { IInitiateCall } from "./callLog.interface.js";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

const initiateCall = async (callerId: string, payload: IInitiateCall) => {
  const caller = await prisma.user.findUnique({
    where: { id: callerId },
  });

  const receiver = await prisma.user.findUnique({
    where: { id: payload.receiverId },
  });

  if (!caller || !receiver) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (!caller.phone || !receiver.phone) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Both caller and receiver must have valid phone numbers configured",
    );
  }

  let callLog = await prisma.callLog.create({
    data: {
      callerId,
      receiverId: payload.receiverId,
      apartmentId: payload.apartmentId,
      status: "INITIATED",
    },
    include: {
      caller: {
        select: { id: true, username: true, phone: true },
      },
      receiver: {
        select: { id: true, username: true, phone: true },
      },
    },
  });

  if (twilioClient && twilioPhoneNumber) {
    try {
      const callbackUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/v1/call/status-webhook`;
      const twimlUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/v1/call/twiml?to=${encodeURIComponent(receiver.phone)}`;

      const call = await twilioClient.calls.create({
        url: twimlUrl,
        to: caller.phone,
        from: twilioPhoneNumber,
        statusCallback: callbackUrl,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        statusCallbackMethod: "POST",
      });

      callLog = await prisma.callLog.update({
        where: { id: callLog.id },
        data: {
          twilioCallSid: call.sid,
          status: call.status || "INITIATED",
        },
        include: {
          caller: { select: { id: true, username: true, phone: true } },
          receiver: { select: { id: true, username: true, phone: true } },
        },
      });
    } catch (err: any) {
      console.error("Twilio call initiation error:", err?.message || err);
    }
  }

  return callLog;
};

const handleTwilioStatusWebhook = async (payload: any) => {
  const { CallSid, CallDuration, CallStatus } = payload;

  if (!CallSid) return null;

  const durationInSeconds = Number(CallDuration) || 0;

  const updatedLog = await prisma.callLog.updateMany({
    where: { twilioCallSid: CallSid },
    data: {
      duration: durationInSeconds,
      status: CallStatus || "COMPLETED",
    },
  });

  return updatedLog;
};

const getMyCallLogs = async (userId: string) => {
  const logs = await prisma.callLog.findMany({
    where: {
      OR: [{ callerId: userId }, { receiverId: userId }],
    },
    include: {
      caller: {
        select: { id: true, username: true, profileImage: true, phone: true },
      },
      receiver: {
        select: { id: true, username: true, profileImage: true, phone: true },
      },
      apartment: {
        select: { id: true, title: true, city: true, coverImage: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalDurationSeconds = logs.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  const minutes = Math.floor(totalDurationSeconds / 60);
  const seconds = totalDurationSeconds % 60;

  return {
    totalDurationSeconds,
    totalDurationFormatted: `${minutes}m ${seconds}s`,
    callCount: logs.length,
    logs,
  };
};

export const CallLogServices = {
  initiateCall,
  handleTwilioStatusWebhook,
  getMyCallLogs,
};
