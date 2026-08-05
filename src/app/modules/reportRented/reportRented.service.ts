import { StatusCodes } from "http-status-codes";
import config from "../../../config/index.js";
import ApiError from "../../../errors/ApiError.js";
import { prisma } from "../../../helpers/prisma.js";
import { stripe } from "../../../helpers/stripe.js";
import { ICreateReportRentedIntent } from "./reportRented.interface.js";

const createReportRentedIntent = async (
  userId: string,
  payload: ICreateReportRentedIntent,
) => {
  const apartment = await prisma.apartment.findUnique({
    where: { userId },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "You do not have an active apartment listing");
  }

  let weekendDate = new Date();
  if (payload.weekend) {
    const d = new Date(payload.weekend);
    if (!isNaN(d.getTime())) {
      weekendDate = d;
    }
  }

  const reportRented = await prisma.reportRented.create({
    data: {
      apartmentId: apartment.id,
      bookingId: payload.bookingId,
      weekend: weekendDate,
    },
  });

  const amountInILS = config.fees.report_rented_fee || 50; // 50 ILS
  const amountInCents = Math.round(amountInILS * 100);

  let clientSecret: string | null = null;
  let paymentIntentId: string | null = null;

  if (process.env.STRIPE_SECRET_KEY) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: (config.stripe.currency || "ils").toLowerCase(),
      metadata: {
        paymentType: "REPORT_RENTED_FEE",
        reportRentedId: reportRented.id,
        apartmentId: apartment.id,
        userId,
      },
    });

    clientSecret = paymentIntent.client_secret;
    paymentIntentId = paymentIntent.id;
  }

  const paymentRecord = await prisma.reportRentedPayment.create({
    data: {
      reportRentedId: reportRented.id,
      bookingId: payload.bookingId,
      apartmentId: apartment.id,
      payerId: userId,
      amount: amountInILS,
      currency: config.stripe.currency || "ILS",
      paymentMethod: "STRIPE",
      stripePaymentIntentId: paymentIntentId,
      status: "PENDING",
    },
  });

  return {
    reportRentedId: reportRented.id,
    paymentId: paymentRecord.id,
    amount: amountInILS,
    currency: config.stripe.currency || "ILS",
    clientSecret,
  };
};

const getMyReportedRented = async (userId: string) => {
  const apartment = await prisma.apartment.findUnique({
    where: { userId },
  });

  if (!apartment) {
    return [];
  }

  const reports = await prisma.reportRented.findMany({
    where: { apartmentId: apartment.id },
    include: {
      booking: true,
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return reports;
};

export const ReportRentedServices = {
  createReportRentedIntent,
  getMyReportedRented,
};
