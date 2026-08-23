import { StatusCodes } from "http-status-codes";
import config from "../../../config/index.js";
import ApiError from "../../../errors/ApiError.js";
import { verifyNedarimTransaction } from "../../../helpers/nedarim.js";
import { prisma } from "../../../helpers/prisma.js";
import {
  ICreateListingPaymentPayload,
  ICreateReportRentedPaymentPayload,
  ICreateSwapPaymentPayload,
  IVerifyNedarimPaymentPayload,
} from "./payment.interface.js";

const createListingPaymentIntent = async (userId: string, apartmentId: string) => {
  const apartment = await prisma.apartment.findUnique({
    where: { id: apartmentId },
    include: { user: { select: { username: true, email: true, phone: true } } },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  if (apartment.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not own this apartment");
  }

  const feeAmount = config.fees.apartment_listing_fee || 100;

  let listingPayment = await prisma.apartmentListingPayment.findUnique({
    where: { apartmentId },
  });

  if (listingPayment && listingPayment.status === "COMPLETED") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Listing fee has already been paid for this apartment",
    );
  }

  if (!listingPayment) {
    listingPayment = await prisma.apartmentListingPayment.create({
      data: {
        apartmentId,
        userId,
        amount: feeAmount,
        currency: "ILS",
        paymentMethod: "NEDARIM_PLUS",
        status: "PENDING",
      },
    });
  }

  return {
    mosadId: config.nedarim.mosad_id || "",
    amount: feeAmount,
    currency: "ILS",
    paymentType: "APARTMENT_LISTING",
    listingPaymentId: listingPayment.id,
    apartmentId,
    clientName: apartment.user.username,
    clientEmail: apartment.user.email || "",
    clientPhone: apartment.user.phone || "",
  };
};

const createSwapPaymentIntent = async (userId: string, swapId: string) => {
  const swap = await prisma.swap.findUnique({
    where: { id: swapId },
    include: {
      fromApartment: { include: { user: true } },
      toApartment: { include: { user: true } },
    },
  });

  if (!swap) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Swap request not found");
  }

  const isFromOwner = swap.fromApartment.userId === userId;
  const isToOwner = swap.toApartment.userId === userId;

  if (!isFromOwner && !isToOwner) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not a participant in this swap request",
    );
  }

  const feeAmount = config.fees.swap_request_fee || 50;

  let swapPayment = await prisma.swapPayment.findFirst({
    where: {
      swapId,
      payerId: userId,
    },
  });

  if (swapPayment && swapPayment.status === "COMPLETED") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Swap request fee has already been paid for this request",
    );
  }

  if (!swapPayment) {
    swapPayment = await prisma.swapPayment.create({
      data: {
        swapId,
        payerId: userId,
        amount: feeAmount,
        currency: "ILS",
        paymentMethod: "NEDARIM_PLUS",
        status: "PENDING",
      },
    });
  }

  const payerUser = isFromOwner ? swap.fromApartment.user : swap.toApartment.user;

  return {
    mosadId: config.nedarim.mosad_id || "",
    amount: feeAmount,
    currency: "ILS",
    paymentType: "SWAP_REQUEST",
    swapPaymentId: swapPayment.id,
    swapId,
    clientName: payerUser.username,
    clientEmail: payerUser.email || "",
    clientPhone: payerUser.phone || "",
  };
};

const createReportRentedPaymentIntent = async (
  userId: string,
  payload: ICreateReportRentedPaymentPayload,
) => {
  const apartment = await prisma.apartment.findUnique({
    where: { userId },
    include: { user: { select: { username: true, email: true, phone: true } } },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "You do not have an active apartment listing");
  }

  const feeAmount = config.fees.report_rented_fee || 50;
  let reportRentedId = payload.reportRentedId;

  if (!reportRentedId) {
    const reportRented = await prisma.reportRented.create({
      data: {
        apartmentId: apartment.id,
        targetApartmentId: payload.targetApartmentId || null,
        reportType: payload.reportType || "RENT",
        weekend: payload.weekend ? new Date(payload.weekend) : new Date(),
      },
    });
    reportRentedId = reportRented.id;
  }

  let reportRentedPayment = await prisma.reportRentedPayment.findFirst({
    where: {
      reportRentedId,
      payerId: userId,
    },
  });

  if (reportRentedPayment && reportRentedPayment.status === "COMPLETED") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Report rented fee has already been paid",
    );
  }

  if (!reportRentedPayment) {
    reportRentedPayment = await prisma.reportRentedPayment.create({
      data: {
        reportRentedId,
        apartmentId: apartment.id,
        payerId: userId,
        amount: feeAmount,
        currency: "ILS",
        paymentMethod: "NEDARIM_PLUS",
        status: "PENDING",
      },
    });
  }

  return {
    mosadId: config.nedarim.mosad_id || "",
    amount: feeAmount,
    currency: "ILS",
    paymentType: "REPORT_RENTED",
    reportRentedPaymentId: reportRentedPayment.id,
    reportRentedId,
    clientName: apartment.user.username,
    clientEmail: apartment.user.email || "",
    clientPhone: apartment.user.phone || "",
  };
};

const verifyAndConfirmNedarimPayment = async (
  userId: string,
  payload: IVerifyNedarimPaymentPayload,
) => {
  const { transactionId, paymentType, paymentRecordId, apartmentId, swapId, reportRentedId } =
    payload;

  if (!transactionId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Transaction ID is required");
  }

  let expectedFee = 0;
  if (paymentType === "APARTMENT_LISTING") {
    expectedFee = config.fees.apartment_listing_fee || 100;
  } else if (paymentType === "SWAP_REQUEST") {
    expectedFee = config.fees.swap_request_fee || 50;
  } else if (paymentType === "REPORT_RENTED") {
    expectedFee = config.fees.report_rented_fee || 50;
  }

  // Verify transaction with Nedarim Plus API
  const verification = await verifyNedarimTransaction(transactionId, expectedFee);

  if (!verification.isSuccess) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Nedarim Plus Payment Verification Failed: ${verification.message}`,
    );
  }

  if (paymentType === "APARTMENT_LISTING") {
    const targetListingPayment = paymentRecordId
      ? await prisma.apartmentListingPayment.findUnique({ where: { id: paymentRecordId } })
      : apartmentId
        ? await prisma.apartmentListingPayment.findUnique({ where: { apartmentId } })
        : await prisma.apartmentListingPayment.findFirst({ where: { userId } });

    if (!targetListingPayment) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Apartment listing payment record not found");
    }

    await prisma.$transaction(async (tx) => {
      await tx.apartmentListingPayment.update({
        where: { id: targetListingPayment.id },
        data: {
          status: "COMPLETED",
          paidAt: new Date(),
          transactionId,
        },
      });

      await tx.apartment.update({
        where: { id: targetListingPayment.apartmentId },
        data: {
          status: "CONFIRMED",
        },
      });
    });

    return {
      success: true,
      message: "Apartment listing payment confirmed and apartment activated successfully",
      apartmentId: targetListingPayment.apartmentId,
      transactionId,
    };
  } else if (paymentType === "SWAP_REQUEST") {
    const targetSwapPayment = paymentRecordId
      ? await prisma.swapPayment.findUnique({ where: { id: paymentRecordId } })
      : swapId
        ? await prisma.swapPayment.findFirst({ where: { swapId, payerId: userId } })
        : null;

    if (!targetSwapPayment) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Swap payment record not found");
    }

    await prisma.$transaction(async (tx) => {
      await tx.swapPayment.update({
        where: { id: targetSwapPayment.id },
        data: {
          status: "COMPLETED",
          paidAt: new Date(),
          transactionId,
        },
      });

      await tx.swap.update({
        where: { id: targetSwapPayment.swapId },
        data: {
          status: "APPROVED",
        },
      });
    });

    return {
      success: true,
      message: "Swap request payment confirmed and swap approved successfully",
      swapId: targetSwapPayment.swapId,
      transactionId,
    };
  } else if (paymentType === "REPORT_RENTED") {
    const targetReportPayment = paymentRecordId
      ? await prisma.reportRentedPayment.findUnique({ where: { id: paymentRecordId } })
      : reportRentedId
        ? await prisma.reportRentedPayment.findFirst({ where: { reportRentedId, payerId: userId } })
        : null;

    if (!targetReportPayment) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Report rented payment record not found");
    }

    await prisma.$transaction(async (tx) => {
      await tx.reportRentedPayment.update({
        where: { id: targetReportPayment.id },
        data: {
          status: "COMPLETED",
          paidAt: new Date(),
          transactionId,
        },
      });

      if (targetReportPayment.reportRentedId) {
        await tx.reportRented.update({
          where: { id: targetReportPayment.reportRentedId },
          data: {
            paidAt: new Date(),
          },
        });
      }
    });

    return {
      success: true,
      message: "Report rented payment confirmed successfully",
      reportRentedId: targetReportPayment.reportRentedId,
      transactionId,
    };
  }

  return { success: true, message: "Nedarim payment verified successfully" };
};

const handleNedarimCallback = async (payload: any) => {
  const transactionId = payload.TransactionId || payload.transactionId || payload.ConfirmationNo;
  const paymentType = payload.Param1 || payload.paymentType;
  const paymentRecordId = payload.Param2 || payload.paymentRecordId;

  if (transactionId && paymentType && paymentRecordId) {
    await verifyAndConfirmNedarimPayment("SYSTEM", {
      transactionId,
      paymentType,
      paymentRecordId,
    });
  }

  return { received: true };
};

export const PaymentServices = {
  createListingPaymentIntent,
  createSwapPaymentIntent,
  createReportRentedPaymentIntent,
  verifyAndConfirmNedarimPayment,
  handleNedarimCallback,
};
