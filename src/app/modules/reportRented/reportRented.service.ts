import { SwapStatus } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import config from "../../../config/index.js";
import ApiError from "../../../errors/ApiError.js";
import { verifyNedarimTransaction } from "../../../helpers/nedarim.js";
import { notifyAdminOnReportRented } from "../../../helpers/notificationHelper.js";
import { parseFlexibleDate } from "../../../helpers/parseDate.js";
import { prisma } from "../../../helpers/prisma.js";
import {
  ICreateReportRentedIntent,
  IPayAllReportRentedDuesPayload,
  IPayReportRentedPayload,
  IReportRentedDuesSummary,
  IReportRentedStats,
} from "./reportRented.interface.js";

/**
 * Helper to process Ambassador Rental Commission within a transaction
 */
const processAmbassadorRentalCommission = async (
  tx: any,
  apartmentId: string,
  reportRentedId: string,
  now: Date,
) => {
  try {
    const attribution = await tx.ambassadorAttribution.findFirst({
      where: {
        apartmentId,
        status: "ACTIVE",
      },
      include: { ambassador: true },
    });

    if (attribution && attribution.model) {
      const defaultRates = {
        modelAListing: 15,
        modelARental: 25,
        modelBListing: 25,
        modelBRental: 40,
        subReferralListing: 5,
      };
      const ambRates = (attribution.ambassador.rates as any) || defaultRates;

      if (attribution.model === "MODEL_A") {
        const listingCreatedAt = new Date(attribution.listingCreatedAt);
        const isWithin12Months =
          now.getTime() - listingCreatedAt.getTime() <= 365 * 24 * 60 * 60 * 1000;

        if (isWithin12Months) {
          await tx.ambassadorCommission.create({
            data: {
              ambassadorId: attribution.ambassadorId,
              type: "RENTAL",
              sourceListingId: apartmentId,
              sourceRentalId: reportRentedId,
              apartmentTitle: attribution.apartmentTitle,
              amount: ambRates.modelARental ?? 25,
              status: "APPROVED",
              earnedAt: now,
            },
          });
        }
      } else if (attribution.model === "MODEL_B") {
        const existingRentalCommission = await tx.ambassadorCommission.findFirst({
          where: {
            sourceListingId: apartmentId,
            type: "RENTAL",
            status: { not: "REVERSED" },
          },
        });

        if (!existingRentalCommission) {
          await tx.ambassadorCommission.create({
            data: {
              ambassadorId: attribution.ambassadorId,
              type: "RENTAL",
              sourceListingId: apartmentId,
              sourceRentalId: reportRentedId,
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
};

const createReportRentedIntent = async (
  userId: string,
  payload: ICreateReportRentedIntent,
) => {
  const apartment = await prisma.apartment.findUnique({
    where: { userId },
    include: { user: { select: { username: true, email: true, phone: true } } },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "You do not have an active apartment listing");
  }

  const reportType = payload.reportType || "RENT";
  let resolvedTargetApartmentId: string | null = null;
  let targetApartment: any = null;

  if (reportType === "SWAP") {
    if (!payload.targetApartmentId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Target apartment must be specified when reporting rented against a swap",
      );
    }

    targetApartment = await prisma.apartment.findFirst({
      where: {
        OR: [
          { id: payload.targetApartmentId },
          { propertyId: payload.targetApartmentId },
        ],
      },
    });

    if (!targetApartment) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Target apartment for swap not found");
    }

    if (targetApartment.id === apartment.id) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "You cannot swap an apartment with itself");
    }

    resolvedTargetApartmentId = targetApartment.id;
  } else if (payload.targetApartmentId) {
    targetApartment = await prisma.apartment.findFirst({
      where: {
        OR: [
          { id: payload.targetApartmentId },
          { propertyId: payload.targetApartmentId },
        ],
      },
    });
    if (targetApartment) {
      resolvedTargetApartmentId = targetApartment.id;
    }
  }

  let weekendDate = new Date();
  if (payload.weekend) {
    const d = parseFlexibleDate(payload.weekend);
    if (d) {
      weekendDate = d;
    }
  }

  const amountInILS = config.fees.report_rented_fee || 50;

  let reportRented: any = null;
  let paymentRecord: any = null;

  if (reportType === "SWAP" && resolvedTargetApartmentId) {
    // Check if a report for this user's apartment already exists for this swap
    const existingReport = await prisma.reportRented.findFirst({
      where: {
        apartmentId: apartment.id,
        targetApartmentId: resolvedTargetApartmentId,
        reportType: "SWAP",
      },
      include: {
        payment: true,
        targetApartment: {
          select: {
            id: true,
            propertyId: true,
            title: true,
            city: true,
          },
        },
      },
    });

    if (existingReport) {
      reportRented = existingReport;
      if (existingReport.payment) {
        paymentRecord = existingReport.payment;
      }
    } else {
      // Create user's swap report
      reportRented = await prisma.reportRented.create({
        data: {
          apartmentId: apartment.id,
          targetApartmentId: resolvedTargetApartmentId,
          reportType: "SWAP",
          weekend: weekendDate,
        },
        include: {
          targetApartment: {
            select: {
              id: true,
              propertyId: true,
              title: true,
              city: true,
            },
          },
        },
      });
    }

    // Ensure a mirrored report and pending payment exist for the counterpart owner (target apartment)
    const counterpartExistingReport = await prisma.reportRented.findFirst({
      where: {
        apartmentId: resolvedTargetApartmentId,
        targetApartmentId: apartment.id,
        reportType: "SWAP",
      },
      include: { payment: true },
    });

    if (!counterpartExistingReport) {
      const counterpartReport = await prisma.reportRented.create({
        data: {
          apartmentId: resolvedTargetApartmentId,
          targetApartmentId: apartment.id,
          reportType: "SWAP",
          weekend: weekendDate,
        },
      });

      await prisma.reportRentedPayment.create({
        data: {
          reportRentedId: counterpartReport.id,
          apartmentId: resolvedTargetApartmentId,
          payerId: targetApartment.userId,
          amount: amountInILS,
          currency: "ILS",
          paymentMethod: "NEDARIM_PLUS",
          status: "PENDING",
        },
      });
    } else if (!counterpartExistingReport.payment) {
      await prisma.reportRentedPayment.create({
        data: {
          reportRentedId: counterpartExistingReport.id,
          apartmentId: resolvedTargetApartmentId,
          payerId: targetApartment.userId,
          amount: amountInILS,
          currency: "ILS",
          paymentMethod: "NEDARIM_PLUS",
          status: "PENDING",
        },
      });
    }

    // Update any existing pending Swap requests between these two apartments to APPROVED
    await prisma.swap.updateMany({
      where: {
        OR: [
          { fromAppId: apartment.id, toAppId: resolvedTargetApartmentId },
          { fromAppId: resolvedTargetApartmentId, toAppId: apartment.id },
        ],
        status: SwapStatus.PENDING,
      },
      data: {
        status: SwapStatus.APPROVED,
      },
    });
  } else {
    // Standard RENT report
    reportRented = await prisma.reportRented.create({
      data: {
        apartmentId: apartment.id,
        targetApartmentId: resolvedTargetApartmentId,
        reportType: "RENT",
        weekend: weekendDate,
      },
      include: {
        targetApartment: {
          select: {
            id: true,
            propertyId: true,
            title: true,
            city: true,
          },
        },
      },
    });
  }

  // Create payment record for the current user if not present
  if (!paymentRecord) {
    paymentRecord = await prisma.reportRentedPayment.create({
      data: {
        reportRentedId: reportRented.id,
        apartmentId: apartment.id,
        payerId: userId,
        amount: amountInILS,
        currency: "ILS",
        paymentMethod: "NEDARIM_PLUS",
        status: "PENDING",
      },
    });
  }

  return {
    reportRentedId: reportRented.id,
    paymentId: paymentRecord.id,
    reportType: reportRented.reportType,
    targetApartment: reportRented.targetApartment,
    amount: amountInILS,
    currency: "ILS",
    paymentStatus: paymentRecord.status,
    mosadId: config.nedarim.mosad_id || "",
    paymentType: "REPORT_RENTED",
    clientName: apartment.user.username,
    clientEmail: apartment.user.email || "",
    clientPhone: apartment.user.phone || "",
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
      apartment: {
        select: {
          id: true,
          propertyId: true,
          title: true,
          city: true,
          coverImage: true,
        },
      },
      targetApartment: {
        select: {
          id: true,
          propertyId: true,
          title: true,
          city: true,
          coverImage: true,
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const enrichedReports = await Promise.all(
    reports.map(async (report) => {
      if (report.reportType === "SWAP" && report.targetApartmentId) {
        const counterpartReport = await prisma.reportRented.findFirst({
          where: {
            apartmentId: report.targetApartmentId,
            targetApartmentId: report.apartmentId,
            reportType: "SWAP",
          },
          include: { payment: true },
        });

        return {
          ...report,
          counterpartPayment: counterpartReport?.payment || null,
        };
      }
      return report;
    }),
  );

  return enrichedReports;
};

/**
 * Report Rented Stats for Owner
 */
const getReportRentedStats = async (userId: string): Promise<IReportRentedStats> => {
  const apartment = await prisma.apartment.findUnique({
    where: { userId },
  });

  const feePerReport = config.fees.report_rented_fee || 50;

  if (!apartment) {
    return {
      totalReports: 0,
      totalPendingCount: 0,
      totalPendingAmount: 0,
      totalPaidCount: 0,
      totalPaidAmount: 0,
      rentReportsCount: 0,
      swapReportsCount: 0,
      feePerReport,
    };
  }

  const reports = await prisma.reportRented.findMany({
    where: { apartmentId: apartment.id },
    include: { payment: true },
  });

  const totalReports = reports.length;
  const paidReports = reports.filter((r) => r.paidAt || r.payment?.status === "COMPLETED");
  const pendingReports = reports.filter((r) => !r.paidAt && r.payment?.status !== "COMPLETED");

  const totalPaidCount = paidReports.length;
  const totalPaidAmount = totalPaidCount * feePerReport;

  const totalPendingCount = pendingReports.length;
  const totalPendingAmount = totalPendingCount * feePerReport;

  const rentReportsCount = reports.filter((r) => r.reportType === "RENT").length;
  const swapReportsCount = reports.filter((r) => r.reportType === "SWAP").length;

  return {
    totalReports,
    totalPendingCount,
    totalPendingAmount,
    totalPaidCount,
    totalPaidAmount,
    rentReportsCount,
    swapReportsCount,
    feePerReport,
  };
};

/**
 * Get all unpaid dues summary and report list for Owner
 */
const getMyReportRentedDues = async (userId: string): Promise<IReportRentedDuesSummary> => {
  const apartment = await prisma.apartment.findUnique({
    where: { userId },
  });

  const feePerReport = config.fees.report_rented_fee || 50;

  if (!apartment) {
    return {
      totalDueAmount: 0,
      unpaidCount: 0,
      reportRentedIds: [],
      reports: [],
      feePerReport,
      mosadId: config.nedarim.mosad_id || "",
    };
  }

  const unpaidReports = await prisma.reportRented.findMany({
    where: {
      apartmentId: apartment.id,
      paidAt: null,
      OR: [
        { payment: null },
        { payment: { status: { not: "COMPLETED" } } },
      ],
    },
    include: {
      apartment: {
        select: {
          id: true,
          propertyId: true,
          title: true,
          city: true,
          coverImage: true,
        },
      },
      targetApartment: {
        select: {
          id: true,
          propertyId: true,
          title: true,
          city: true,
          coverImage: true,
        },
      },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const unpaidCount = unpaidReports.length;
  const totalDueAmount = unpaidCount * feePerReport;
  const reportRentedIds = unpaidReports.map((r) => r.id);

  return {
    totalDueAmount,
    unpaidCount,
    reportRentedIds,
    reports: unpaidReports,
    feePerReport,
    mosadId: config.nedarim.mosad_id || "",
  };
};

/**
 * Pay a single unpaid report rented item by ID
 */
const paySingleReportRented = async (
  userId: string,
  reportRentedId: string,
  payload: IPayReportRentedPayload,
) => {
  const apartment = await prisma.apartment.findUnique({
    where: { userId },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "You do not have an active apartment listing");
  }

  const report = await prisma.reportRented.findUnique({
    where: { id: reportRentedId },
    include: {
      apartment: { include: { user: true } },
      payment: true,
    },
  });

  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Rental report record not found");
  }

  if (report.apartmentId !== apartment.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not have permission to pay for this rental report");
  }

  if (report.paidAt || report.payment?.status === "COMPLETED") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "This rental report has already been marked as paid");
  }

  const feeAmount = config.fees.report_rented_fee || 50;
  let transactionId = payload.transactionId;

  if (payload.paymentMethod === "NEDARIM_PLUS") {
    if (!transactionId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Transaction ID is required for Nedarim Plus verification");
    }

    const verification = await verifyNedarimTransaction(transactionId, feeAmount);
    if (!verification.isSuccess) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Nedarim Plus Payment Verification Failed: ${verification.message}`,
      );
    }
  } else {
    // Direct Card Payment
    transactionId = transactionId || `TX-CC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // 1. Mark report rented as paid
    await tx.reportRented.update({
      where: { id: reportRentedId },
      data: { paidAt: now },
    });

    // 2. Mark or create payment record
    if (report.payment) {
      await tx.reportRentedPayment.update({
        where: { id: report.payment.id },
        data: {
          status: "COMPLETED",
          paymentMethod: "NEDARIM_PLUS",
          paidAt: now,
          transactionId,
        },
      });
    } else {
      await tx.reportRentedPayment.create({
        data: {
          reportRentedId,
          apartmentId: apartment.id,
          payerId: userId,
          amount: feeAmount,
          currency: "ILS",
          paymentMethod: "NEDARIM_PLUS",
          status: "COMPLETED",
          paidAt: now,
          transactionId,
        },
      });
    }

    // 3. Process Ambassador Rental Commission
    await processAmbassadorRentalCommission(tx, apartment.id, reportRentedId, now);
  });

  // 4. Notify admin asynchronously
  try {
    await notifyAdminOnReportRented({
      reportRentedId,
      apartmentTitle: report.apartment?.title || "Apartment",
      city: report.apartment?.city || "Israel",
      weekend: report.weekend || now,
      hostName: report.apartment?.user?.username || "Host",
      amount: feeAmount,
    });
  } catch (notifErr) {
    console.error("[Notification] Error notifying admin on report rented:", notifErr);
  }

  return {
    success: true,
    message: `Rental report paid successfully via ${payload.paymentMethod}`,
    reportRentedId,
    transactionId,
    paidAt: now,
    amount: feeAmount,
    paymentMethod: payload.paymentMethod,
  };
};

/**
 * Pay all pending report rented dues in a single batch
 */
const payAllReportRentedDues = async (
  userId: string,
  payload: IPayAllReportRentedDuesPayload,
) => {
  const apartment = await prisma.apartment.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "You do not have an active apartment listing");
  }

  const whereClause: any = {
    apartmentId: apartment.id,
    paidAt: null,
    OR: [
      { payment: null },
      { payment: { status: { not: "COMPLETED" } } },
    ],
  };

  if (payload.reportRentedIds && payload.reportRentedIds.length > 0) {
    whereClause.id = { in: payload.reportRentedIds };
  }

  const unpaidReports = await prisma.reportRented.findMany({
    where: whereClause,
    include: { payment: true, apartment: { include: { user: true } } },
  });

  if (unpaidReports.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "No unpaid rental reports found to process");
  }

  const feePerReport = config.fees.report_rented_fee || 50;
  const totalAmount = unpaidReports.length * feePerReport;
  let transactionId = payload.transactionId;

  if (payload.paymentMethod === "NEDARIM_PLUS") {
    if (!transactionId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Transaction ID is required for Nedarim Plus verification");
    }

    const verification = await verifyNedarimTransaction(transactionId, totalAmount);
    if (!verification.isSuccess) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Nedarim Plus Payment Verification Failed: ${verification.message}`,
      );
    }
  } else {
    // Direct Card Payment Batch
    transactionId = transactionId || `TX-CC-BATCH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < unpaidReports.length; i++) {
      const report = unpaidReports[i];
      const itemTxId = unpaidReports.length === 1 ? transactionId! : `${transactionId}-${i + 1}`;

      // Mark report rented as paid
      await tx.reportRented.update({
        where: { id: report.id },
        data: { paidAt: now },
      });

      // Update or create payment record
      if (report.payment) {
        await tx.reportRentedPayment.update({
          where: { id: report.payment.id },
          data: {
            status: "COMPLETED",
            paymentMethod: "NEDARIM_PLUS",
            paidAt: now,
            transactionId: itemTxId,
          },
        });
      } else {
        await tx.reportRentedPayment.create({
          data: {
            reportRentedId: report.id,
            apartmentId: apartment.id,
            payerId: userId,
            amount: feePerReport,
            currency: "ILS",
            paymentMethod: "NEDARIM_PLUS",
            status: "COMPLETED",
            paidAt: now,
            transactionId: itemTxId,
          },
        });
      }

      // Process ambassador commission for each report
      await processAmbassadorRentalCommission(tx, apartment.id, report.id, now);
    }
  });

  return {
    success: true,
    message: `Successfully paid all ${unpaidReports.length} rental report dues (${totalAmount} ILS)`,
    paidCount: unpaidReports.length,
    totalPaidAmount: totalAmount,
    reportRentedIds: unpaidReports.map((r) => r.id),
    transactionId,
    paidAt: now,
    paymentMethod: payload.paymentMethod,
  };
};

const getAllReportRentedAdmin = async () => {
  const reports = await prisma.reportRented.findMany({
    include: {
      apartment: {
        select: {
          id: true,
          propertyId: true,
          title: true,
          city: true,
          neighborhood: true,
          coverImage: true,
          user: {
            select: { id: true, username: true, email: true, phone: true },
          },
        },
      },
      targetApartment: {
        select: {
          id: true,
          propertyId: true,
          title: true,
          city: true,
          coverImage: true,
          user: {
            select: { id: true, username: true, email: true, phone: true },
          },
        },
      },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return reports;
};

const markReportAsPaidAdmin = async (reportRentedId: string) => {
  const report = await prisma.reportRented.findUnique({
    where: { id: reportRentedId },
    include: { payment: true, apartment: true },
  });

  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Report rented record not found");
  }

  const now = new Date();
  const txId = `ADMIN-PAID-${Date.now()}`;

  await prisma.$transaction(async (tx) => {
    await tx.reportRented.update({
      where: { id: reportRentedId },
      data: { paidAt: now },
    });

    if (report.payment) {
      await tx.reportRentedPayment.update({
        where: { id: report.payment.id },
        data: {
          status: "COMPLETED",
          paidAt: now,
          transactionId: txId,
        },
      });
    } else {
      await tx.reportRentedPayment.create({
        data: {
          reportRentedId: report.id,
          apartmentId: report.apartmentId,
          payerId: report.apartment.userId,
          amount: config.fees.report_rented_fee || 50,
          currency: "ILS",
          paymentMethod: "NEDARIM_PLUS",
          status: "COMPLETED",
          paidAt: now,
          transactionId: txId,
        },
      });
    }
  });

  return {
    success: true,
    message: "Report rented marked as paid successfully by admin",
    reportRentedId,
    paidAt: now,
  };
};

export const ReportRentedServices = {
  createReportRentedIntent,
  getMyReportedRented,
  getReportRentedStats,
  getMyReportRentedDues,
  paySingleReportRented,
  payAllReportRentedDues,
  getAllReportRentedAdmin,
  markReportAsPaidAdmin,
};
