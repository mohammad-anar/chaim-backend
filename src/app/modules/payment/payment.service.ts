import { StatusCodes } from "http-status-codes";
import config from "../../../config/index.js";
import ApiError from "../../../errors/ApiError.js";
import { prisma } from "../../../helpers/prisma.js";
import { stripe } from "../../../helpers/stripe.js";

const createListingPaymentIntent = async (userId: string, apartmentId: string) => {
  const apartment = await prisma.apartment.findUnique({
    where: { id: apartmentId },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  if (apartment.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not own this apartment");
  }

  const feeAmount = config.fees.apartment_listing_fee || 100;
  const currency = (config.stripe.currency || "ILS").toLowerCase();

  let listingPayment = await prisma.apartmentListingPayment.findUnique({
    where: { apartmentId },
  });

  if (listingPayment && listingPayment.status === "COMPLETED") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Listing fee has already been paid for this apartment");
  }

  if (!listingPayment) {
    listingPayment = await prisma.apartmentListingPayment.create({
      data: {
        apartmentId,
        userId,
        amount: feeAmount,
        currency: config.stripe.currency || "ILS",
        paymentMethod: "STRIPE",
        status: "PENDING",
      },
    });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(feeAmount * 100),
    currency,
    metadata: {
      paymentType: "APARTMENT_LISTING",
      apartmentId,
      userId,
      listingPaymentId: listingPayment.id,
    },
  });

  await prisma.apartmentListingPayment.update({
    where: { id: listingPayment.id },
    data: {
      stripePaymentIntentId: paymentIntent.id,
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: feeAmount,
    currency: config.stripe.currency || "ILS",
  };
};

const createReportRentedIntent = async (userId: string, bookingId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      apartment: true,
    },
  });

  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Booking not found");
  }

  if (booking.apartment.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You are not the host for this booking");
  }

  const feeAmount = config.fees.report_rented_fee || 50;
  const currency = (config.stripe.currency || "ILS").toLowerCase();

  let reportRentedPayment = await prisma.reportRentedPayment.findUnique({
    where: { bookingId },
  });

  if (reportRentedPayment && reportRentedPayment.status === "COMPLETED") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Report-rented fee has already been paid for this booking");
  }

  if (!reportRentedPayment) {
    reportRentedPayment = await prisma.reportRentedPayment.create({
      data: {
        bookingId,
        apartmentId: booking.apartmentId,
        payerId: userId,
        amount: feeAmount,
        currency: config.stripe.currency || "ILS",
        paymentMethod: "STRIPE",
        status: "PENDING",
      },
    });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(feeAmount * 100),
    currency,
    metadata: {
      paymentType: "REPORT_RENTED",
      bookingId,
      apartmentId: booking.apartmentId,
      userId,
      reportRentedPaymentId: reportRentedPayment.id,
    },
  });

  await prisma.reportRentedPayment.update({
    where: { id: reportRentedPayment.id },
    data: {
      stripePaymentIntentId: paymentIntent.id,
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: feeAmount,
    currency: config.stripe.currency || "ILS",
  };
};

const handleStripeWebhook = async (signature: string, rawBody: Buffer) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.stripe.webhook_secret || "",
    );
  } catch (err: any) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Webhook Error: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const metadata = paymentIntent.metadata;

    if (metadata?.paymentType === "APARTMENT_LISTING") {
      const { apartmentId, listingPaymentId } = metadata;

      await prisma.$transaction(async (tx) => {
        await tx.apartmentListingPayment.update({
          where: { id: listingPaymentId },
          data: {
            status: "COMPLETED",
            paidAt: new Date(),
            stripePaymentIntentId: paymentIntent.id,
          },
        });

        await tx.apartment.update({
          where: { id: apartmentId },
          data: {
            status: "CONFIRMED",
          },
        });
      });
    } else if (metadata?.paymentType === "REPORT_RENTED") {
      const { bookingId, apartmentId, reportRentedPaymentId } = metadata;

      await prisma.$transaction(async (tx) => {
        await tx.reportRentedPayment.update({
          where: { id: reportRentedPaymentId },
          data: {
            status: "COMPLETED",
            paidAt: new Date(),
            stripePaymentIntentId: paymentIntent.id,
          },
        });

        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
        });

        await tx.reportRented.upsert({
          where: { bookingId },
          create: {
            apartmentId,
            bookingId,
            weekend: booking?.createdAt || new Date(),
            paidAt: new Date(),
          },
          update: {
            paidAt: new Date(),
          },
        });
      });
    }
  }

  return { received: true };
};

const verifyAndConfirmPaymentIntent = async (paymentIntentId: string) => {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== "succeeded") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Payment has not succeeded yet. Current status: ${paymentIntent.status}`,
    );
  }

  const metadata = paymentIntent.metadata;

  if (metadata?.paymentType === "APARTMENT_LISTING") {
    const { apartmentId, listingPaymentId } = metadata;

    await prisma.$transaction(async (tx) => {
      await tx.apartmentListingPayment.update({
        where: { id: listingPaymentId },
        data: {
          status: "COMPLETED",
          paidAt: new Date(),
          stripePaymentIntentId: paymentIntent.id,
        },
      });

      await tx.apartment.update({
        where: { id: apartmentId },
        data: {
          status: "CONFIRMED",
        },
      });
    });

    return {
      success: true,
      message: "Apartment listing payment confirmed and apartment activated",
      apartmentId,
    };
  } else if (metadata?.paymentType === "REPORT_RENTED") {
    const { bookingId, apartmentId, reportRentedPaymentId } = metadata;

    await prisma.$transaction(async (tx) => {
      if (reportRentedPaymentId) {
        await tx.reportRentedPayment.update({
          where: { id: reportRentedPaymentId },
          data: {
            status: "COMPLETED",
            paidAt: new Date(),
            stripePaymentIntentId: paymentIntent.id,
          },
        });
      }

      if (bookingId) {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
        });

        await tx.reportRented.upsert({
          where: { bookingId },
          create: {
            apartmentId,
            bookingId,
            weekend: booking?.createdAt || new Date(),
            paidAt: new Date(),
          },
          update: {
            paidAt: new Date(),
          },
        });
      }
    });

    return {
      success: true,
      message: "Report rented payment confirmed successfully",
    };
  }

  return { success: true, message: "Payment verified successfully" };
};

export const PaymentServices = {
  createListingPaymentIntent,
  createReportRentedIntent,
  handleStripeWebhook,
  verifyAndConfirmPaymentIntent,
};
