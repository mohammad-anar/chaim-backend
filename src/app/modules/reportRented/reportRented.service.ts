import { SwapStatus } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import config from "../../../config/index.js";
import ApiError from "../../../errors/ApiError.js";
import { parseFlexibleDate } from "../../../helpers/parseDate.js";
import { prisma } from "../../../helpers/prisma.js";
import { ICreateReportRentedIntent } from "./reportRented.interface.js";

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

export const ReportRentedServices = {
  createReportRentedIntent,
  getMyReportedRented,
  getAllReportRentedAdmin,
};
