import twilio from "twilio";
import { ContactChannel } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import config from "../../../config/index.js";
import ApiError from "../../../errors/ApiError.js";
import { notifyAdminOnCallInitiated, notifyAdminOnWhatsAppInitiated } from "../../../helpers/notificationHelper.js";
import { prisma } from "../../../helpers/prisma.js";
import { IInitiateCall, IInitiateWhatsApp } from "./callLog.interface.js";

const accountSid = config.twilio.account_sid;
const authToken = config.twilio.auth_token;
const twilioPhoneNumber = config.twilio.phone_number || "+97225007890";

// Only initialize Twilio client when real credentials are provided (accountSid must start with "AC")
const isValidTwilioSid = accountSid?.startsWith("AC");
const twilioClient = isValidTwilioSid && authToken ? twilio(accountSid!, authToken) : null;

/**
 * Helper to resolve apartment by ID or propertyId / slug (e.g. "ta-3" or "apart-003")
 */
const findApartment = async (apartmentIdentifier?: string) => {
  if (!apartmentIdentifier) return null;

  return await prisma.apartment.findFirst({
    where: {
      OR: [
        { id: apartmentIdentifier },
        { propertyId: apartmentIdentifier },
        { propertyId: `apart-${apartmentIdentifier.replace(/\D/g, "").padStart(3, "0")}` },
      ],
    },
    include: {
      user: {
        select: { id: true, username: true, email: true, phone: true, profileImage: true },
      },
    },
  });
};

/**
 * Initiate Twilio Masked Voice Call or Hotline Bridge
 */
const initiateCall = async (callerId: string, payload: IInitiateCall) => {
  const caller = await prisma.user.findUnique({
    where: { id: callerId },
  });

  if (!caller) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Caller user account not found");
  }

  let receiverUser: any = null;
  let targetApartment: any = null;

  if (payload.apartmentId) {
    targetApartment = await findApartment(payload.apartmentId);
    if (targetApartment) {
      receiverUser = targetApartment.user;
    }
  }

  if (!receiverUser && payload.receiverId) {
    receiverUser = await prisma.user.findUnique({
      where: { id: payload.receiverId },
      select: { id: true, username: true, email: true, phone: true, profileImage: true },
    });
  }

  if (!receiverUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Target landlord or recipient not found");
  }

  const callerPhone = caller.phone;
  const receiverPhone = targetApartment?.phoneNumber || receiverUser.phone;

  if (!callerPhone || !receiverPhone) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Both caller and receiver must have valid phone numbers registered to initiate a call",
    );
  }

  let callLog = await prisma.callLog.create({
    data: {
      callerId,
      receiverId: receiverUser.id,
      apartmentId: targetApartment?.id || payload.apartmentId || null,
      channel: payload.channel || ContactChannel.VOICE,
      status: "INITIATED",
    },
    include: {
      caller: {
        select: { id: true, username: true, phone: true },
      },
      receiver: {
        select: { id: true, username: true, phone: true },
      },
      apartment: {
        select: { id: true, title: true, propertyId: true, city: true },
      },
    },
  });

  // Dispatch Real-Time Alert to Super Admin
  await notifyAdminOnCallInitiated({
    callLogId: callLog.id,
    callerName: caller.username,
    receiverName: receiverUser.username,
    apartmentTitle: targetApartment?.title,
    channel: "VOICE",
  });

  // Twilio Programmable Voice Bridging
  if (twilioClient && twilioPhoneNumber) {
    try {
      const callbackUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/v1/call/status-webhook`;
      const twimlUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/v1/call/twiml?to=${encodeURIComponent(receiverPhone)}`;

      const call = await twilioClient.calls.create({
        url: twimlUrl,
        to: callerPhone,
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
          apartment: { select: { id: true, title: true, propertyId: true, city: true } },
        },
      });
    } catch (err: any) {
      console.error("[TwilioVoice] Call initiation error:", err?.message || err);
    }
  }

  return {
    ...callLog,
    hotlineNumber: twilioPhoneNumber,
    isMasked: true,
  };
};

/**
 * Initiate Direct WhatsApp Chat Link with Call Log Tracking & Admin Alert
 */
const initiateWhatsApp = async (callerId: string, payload: IInitiateWhatsApp) => {
  const caller = await prisma.user.findUnique({
    where: { id: callerId },
  });

  if (!caller) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User account not found");
  }

  let receiverUser: any = null;
  let targetApartment: any = null;

  if (payload.apartmentId) {
    targetApartment = await findApartment(payload.apartmentId);
    if (targetApartment) {
      receiverUser = targetApartment.user;
    }
  }

  if (!receiverUser && payload.receiverId) {
    receiverUser = await prisma.user.findUnique({
      where: { id: payload.receiverId },
      select: { id: true, username: true, email: true, phone: true, profileImage: true },
    });
  }

  if (!receiverUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Target landlord or recipient not found");
  }

  const rawPhone = targetApartment?.whatsApp || targetApartment?.phoneNumber || receiverUser.phone || "";
  const cleanPhone = rawPhone.replace(/\D/g, "");

  if (!cleanPhone || cleanPhone.length < 6) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "The landlord has not configured a valid WhatsApp phone number for this listing",
    );
  }

  // Create persistent CallLog entry
  const callLog = await prisma.callLog.create({
    data: {
      callerId,
      receiverId: receiverUser.id,
      apartmentId: targetApartment?.id || payload.apartmentId || null,
      channel: ContactChannel.WHATSAPP,
      duration: 0,
      status: "INITIATED",
    },
    include: {
      caller: {
        select: { id: true, username: true, phone: true },
      },
      receiver: {
        select: { id: true, username: true, phone: true },
      },
      apartment: {
        select: { id: true, title: true, propertyId: true, city: true },
      },
    },
  });

  // Dispatch Real-Time Alert to Super Admin
  await notifyAdminOnWhatsAppInitiated({
    callLogId: callLog.id,
    callerName: caller.username,
    receiverName: receiverUser.username,
    apartmentTitle: targetApartment?.title,
  });

  // Prepare pre-filled message text
  const aptTitle = targetApartment?.title || "Apartment";
  const aptCode = targetApartment?.propertyId ? ` (Code: ${targetApartment.propertyId})` : "";
  const defaultText = `Shalom! I am inquiring about your listing "${aptTitle}"${aptCode} on ShabbosRent.`;
  const messageText = payload.message || defaultText;

  // Format international number (e.g. Israeli local 0541234567 -> 972541234567)
  let intlPhone = cleanPhone;
  if (intlPhone.startsWith("0")) {
    intlPhone = `972${intlPhone.substring(1)}`;
  } else if (!intlPhone.startsWith("972") && intlPhone.length === 9) {
    intlPhone = `972${intlPhone}`;
  }

  const whatsappUrl = `https://wa.me/${intlPhone}?text=${encodeURIComponent(messageText)}`;

  return {
    callLog,
    whatsappUrl,
    targetPhone: intlPhone,
    message: messageText,
  };
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

const getAllCallLogsAdmin = async () => {
  const logs = await prisma.callLog.findMany({
    include: {
      caller: {
        select: { id: true, username: true, email: true, phone: true, profileImage: true },
      },
      receiver: {
        select: { id: true, username: true, email: true, phone: true, profileImage: true },
      },
      apartment: {
        select: { id: true, title: true, city: true, neighborhood: true, coverImage: true },
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
  initiateWhatsApp,
  handleTwilioStatusWebhook,
  getMyCallLogs,
  getAllCallLogsAdmin,
};
