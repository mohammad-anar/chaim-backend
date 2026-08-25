import { StatusCodes } from "http-status-codes";
import config from "../../../config/index.js";
import ApiError from "../../../errors/ApiError.js";
import { verifyNedarimTransaction } from "../../../helpers/nedarim.js";
import { notifyAdminOnReportRented } from "../../../helpers/notificationHelper.js";
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

  const feeAmount = config.fees.apartment_listing_fee || 28;

  let listingPayment = await prisma.apartmentListingPayment.findUnique({
    where: { apartmentId },
  });

  const now = new Date();
  const isStillValid =
    listingPayment &&
    listingPayment.status === "COMPLETED" &&
    listingPayment.expiresAt &&
    new Date(listingPayment.expiresAt) > now;

  if (isStillValid && listingPayment?.expiresAt) {
    const expiryFormatted = new Date(listingPayment.expiresAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Listing fee has already been paid for this apartment and is active until ${expiryFormatted}`,
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
  } else {
    // Renewing expired or pending listing payment for another year
    listingPayment = await prisma.apartmentListingPayment.update({
      where: { id: listingPayment.id },
      data: {
        amount: feeAmount,
        currency: "ILS",
        paymentMethod: "NEDARIM_PLUS",
        status: "PENDING",
        transactionId: null,
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
    validityDuration: "1 Year",
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
    expectedFee = config.fees.apartment_listing_fee || 28;
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

    const paidAt = new Date();
    // 1-year listing validity (365 days)
    const expiresAt = new Date(paidAt.getTime() + 365 * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.apartmentListingPayment.update({
        where: { id: targetListingPayment.id },
        data: {
          status: "COMPLETED",
          paidAt,
          expiresAt,
          transactionId,
        },
      });

      await tx.apartment.update({
        where: { id: targetListingPayment.apartmentId },
        data: {
          status: "CONFIRMED",
        },
      });

      // Process Ambassador Listing Commission
      try {
        const attribution = await tx.ambassadorAttribution.findFirst({
          where: {
            apartmentId: targetListingPayment.apartmentId,
            status: "ACTIVE",
          },
          include: { ambassador: true },
        });

        if (attribution) {
          const now = new Date();
          const defaultRates = {
            modelAListing: 15,
            modelARental: 25,
            modelBListing: 25,
            modelBRental: 40,
            subReferralListing: 5,
          };
          const ambRates = (attribution.ambassador.rates as any) || defaultRates;

          if (attribution.model) {
            const listingAmount =
              attribution.model === "MODEL_A"
                ? (ambRates.modelAListing ?? 15)
                : (ambRates.modelBListing ?? 25);

            const existingComm = await tx.ambassadorCommission.findFirst({
              where: {
                ambassadorId: attribution.ambassadorId,
                sourceListingId: attribution.apartmentId,
                type: "LISTING",
              },
            });

            if (existingComm) {
              await tx.ambassadorCommission.update({
                where: { id: existingComm.id },
                data: {
                  amount: listingAmount,
                  status: "APPROVED",
                },
              });
            } else {
              await tx.ambassadorCommission.create({
                data: {
                  ambassadorId: attribution.ambassadorId,
                  type: "LISTING",
                  sourceListingId: attribution.apartmentId,
                  apartmentTitle: attribution.apartmentTitle,
                  amount: listingAmount,
                  status: "APPROVED",
                  earnedAt: now,
                },
              });
            }

            // Sub-ambassador override for recruiter
            if (attribution.ambassador.recruitedById) {
              const parentAmbassador = await tx.ambassador.findUnique({
                where: { id: attribution.ambassador.recruitedById },
              });
              if (parentAmbassador) {
                const parentRates = (parentAmbassador.rates as any) || defaultRates;
                const existingSub = await tx.ambassadorCommission.findFirst({
                  where: {
                    ambassadorId: parentAmbassador.id,
                    sourceListingId: attribution.apartmentId,
                    type: "SUB_REFERRAL",
                  },
                });

                if (!existingSub) {
                  await tx.ambassadorCommission.create({
                    data: {
                      ambassadorId: parentAmbassador.id,
                      type: "SUB_REFERRAL",
                      sourceListingId: attribution.apartmentId,
                      apartmentTitle: attribution.apartmentTitle,
                      amount: parentRates.subReferralListing ?? 5,
                      status: "APPROVED",
                      earnedAt: now,
                    },
                  });
                }
              }
            }
          }
        }
      } catch (ambErr) {
        console.error("[AmbassadorCommission] Error approving listing commission:", ambErr);
      }
    });

    return {
      success: true,
      message: "Apartment listing payment confirmed and apartment activated for 1 year successfully",
      apartmentId: targetListingPayment.apartmentId,
      transactionId,
      paidAt,
      expiresAt,
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
      ? await prisma.reportRentedPayment.findUnique({
          where: { id: paymentRecordId },
          include: { apartment: true, payer: true, reportRented: true },
        })
      : reportRentedId
        ? await prisma.reportRentedPayment.findFirst({
            where: { reportRentedId, payerId: userId },
            include: { apartment: true, payer: true, reportRented: true },
          })
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

      // Process Ambassador Rental Commission
      try {
        const attribution = await tx.ambassadorAttribution.findFirst({
          where: {
            apartmentId: targetReportPayment.apartmentId,
            status: "ACTIVE",
          },
          include: { ambassador: true },
        });

        if (attribution && attribution.model) {
          const now = new Date();
          const defaultRates = {
            modelAListing: 15,
            modelARental: 25,
            modelBListing: 25,
            modelBRental: 40,
            subReferralListing: 5,
          };
          const ambRates = (attribution.ambassador.rates as any) || defaultRates;

          if (attribution.model === "MODEL_A") {
            // Model A: ₪25 per rental event for 12 months (365 days) from listingCreatedAt
            const listingCreatedAt = new Date(attribution.listingCreatedAt);
            const isWithin12Months = now.getTime() - listingCreatedAt.getTime() <= 365 * 24 * 60 * 60 * 1000;

            if (isWithin12Months) {
              await tx.ambassadorCommission.create({
                data: {
                  ambassadorId: attribution.ambassadorId,
                  type: "RENTAL",
                  sourceListingId: targetReportPayment.apartmentId,
                  sourceRentalId: targetReportPayment.reportRentedId || targetReportPayment.id,
                  apartmentTitle: attribution.apartmentTitle,
                  amount: ambRates.modelARental ?? 25,
                  status: "APPROVED",
                  earnedAt: now,
                },
              });
            }
          } else if (attribution.model === "MODEL_B") {
            // Model B: ₪40 on First Rental Ever Only
            const existingRentalCommission = await tx.ambassadorCommission.findFirst({
              where: {
                sourceListingId: targetReportPayment.apartmentId,
                type: "RENTAL",
                status: { not: "REVERSED" },
              },
            });

            if (!existingRentalCommission) {
              await tx.ambassadorCommission.create({
                data: {
                  ambassadorId: attribution.ambassadorId,
                  type: "RENTAL",
                  sourceListingId: targetReportPayment.apartmentId,
                  sourceRentalId: targetReportPayment.reportRentedId || targetReportPayment.id,
                  apartmentTitle: attribution.apartmentTitle,
                  amount: ambRates.modelBRental ?? 40,
                  status: "APPROVED",
                  earnedAt: now,
                },
              });
            }
          }
        }
      } catch (ambRentErr) {
        console.error("[AmbassadorRentalCommission] Error processing rental commission:", ambRentErr);
      }
    });

    // Notify Admin of Confirmed Rented Apartment
    await notifyAdminOnReportRented({
      reportRentedId: targetReportPayment.reportRentedId || targetReportPayment.id,
      apartmentTitle: targetReportPayment.apartment?.title || "Apartment",
      city: targetReportPayment.apartment?.city || "Israel",
      weekend: targetReportPayment.reportRented?.weekend || new Date(),
      hostName: targetReportPayment.payer?.username || "Host",
      amount: targetReportPayment.amount,
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
  console.log("[NedarimCallback] Received webhook payload:", JSON.stringify(payload, null, 2));

  const transactionId =
    payload.TransactionId ||
    payload.transactionId ||
    payload.ConfirmationNo ||
    payload.confirmationNo ||
    payload.TransId ||
    payload.ConfirmationCode;

  const paymentType =
    payload.Param1 ||
    payload.param1 ||
    payload.paymentType;

  const paymentRecordId =
    payload.Param2 ||
    payload.param2 ||
    payload.paymentRecordId;

  if (transactionId && paymentType && paymentRecordId) {
    try {
      await verifyAndConfirmNedarimPayment("SYSTEM", {
        transactionId: String(transactionId),
        paymentType: String(paymentType) as any,
        paymentRecordId: String(paymentRecordId),
      });
      console.log(`[NedarimCallback] Successfully processed transaction: ${transactionId}`);
    } catch (err: any) {
      console.error(`[NedarimCallback] Error processing callback for txn ${transactionId}:`, err?.message || err);
    }
  } else {
    console.warn("[NedarimCallback] Incomplete parameters in callback payload:", {
      transactionId,
      paymentType,
      paymentRecordId,
    });
  }

  return { received: true };
};

const getAdminAllTransactions = async () => {
  const [listingPayments, swapPayments, reportPayments] = await Promise.all([
    prisma.apartmentListingPayment.findMany({
      include: {
        apartment: { select: { id: true, propertyId: true, title: true, city: true } },
        user: { select: { id: true, username: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.swapPayment.findMany({
      include: {
        swap: {
          select: {
            id: true,
            swapCode: true,
            fromApartment: { select: { id: true, title: true, city: true } },
            toApartment: { select: { id: true, title: true, city: true } },
          },
        },
        payer: { select: { id: true, username: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.reportRentedPayment.findMany({
      include: {
        apartment: { select: { id: true, propertyId: true, title: true, city: true } },
        payer: { select: { id: true, username: true, email: true, phone: true } },
        reportRented: { select: { id: true, reportType: true, weekend: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const transactions = [
    ...listingPayments.map((p) => ({
      id: p.id,
      category: "LISTING_FEE",
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      transactionId: p.transactionId,
      payer: p.user,
      apartment: p.apartment,
      createdAt: p.createdAt,
      paidAt: p.paidAt,
    })),
    ...swapPayments.map((p) => ({
      id: p.id,
      category: "SWAP_FEE",
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      transactionId: p.transactionId,
      payer: p.payer,
      apartment: p.swap?.fromApartment || null,
      swapDetails: p.swap,
      createdAt: p.createdAt,
      paidAt: p.paidAt,
    })),
    ...reportPayments.map((p) => ({
      id: p.id,
      category: p.reportRented?.reportType === "SWAP" ? "SWAP_REPORT_FEE" : "REPORT_RENTED_FEE",
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      transactionId: p.transactionId,
      payer: p.payer,
      apartment: p.apartment,
      createdAt: p.createdAt,
      paidAt: p.paidAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalCollected = transactions
    .filter((t) => t.status === "COMPLETED")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  return {
    totalTransactions: transactions.length,
    totalCollectedILS: totalCollected,
    transactions,
  };
};

export const PaymentServices = {
  createListingPaymentIntent,
  createSwapPaymentIntent,
  createReportRentedPaymentIntent,
  verifyAndConfirmNedarimPayment,
  handleNedarimCallback,
  getAdminAllTransactions,
};
