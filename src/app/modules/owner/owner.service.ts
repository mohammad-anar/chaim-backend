import { AlertType, PaymentStatus, Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import twilio from "twilio";
import config from "../../../config/index.js";
import ApiError from "../../../errors/ApiError.js";
import { emailHelper } from "../../../helpers/emailHelper.js";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { prisma } from "../../../helpers/prisma.js";
import { dispatchNotification } from "../../../helpers/notificationHelper.js";
import { IPaginationOptions } from "../../../types/pagination.js";
import {
  IOwnerFilterRequest,
  ISendReminderPayload,
} from "./owner.interface.js";

const accountSid = config.twilio.account_sid;
const authToken = config.twilio.auth_token;
const twilioPhoneNumber = config.twilio.phone_number || "+97225007890";
const isValidTwilioSid = accountSid?.startsWith("AC");
const twilioClient = isValidTwilioSid && authToken ? twilio(accountSid!, authToken) : null;

/**
 * Get all owners with rich metrics:
 * - totalListings (1)
 * - contact info & notificationPreference
 * - totalEarnings (Listing 28 ILS + Report Rented 50 ILS completed)
 * - totalDue (Unpaid listings + Unpaid reports)
 * - unpaidReportsCount & amount
 * - paidReportsCount & amount
 */
const getAllOwners = async (
  filters: IOwnerFilterRequest,
  options: IPaginationOptions,
) => {
  const { limit, page, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);
  const { searchTerm, hasDue, status, notificationPreference } = filters;

  const andConditions: Prisma.UserWhereInput[] = [
    { isDeleted: false },
    { apartment: { isNot: null } },
  ];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { username: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
        { phone: { contains: searchTerm, mode: "insensitive" } },
        { apartment: { title: { contains: searchTerm, mode: "insensitive" } } },
        { apartment: { city: { contains: searchTerm, mode: "insensitive" } } },
      ],
    });
  }

  if (status) {
    andConditions.push({ status: status as any });
  }

  if (notificationPreference) {
    andConditions.push({ notificationPreference: notificationPreference as any });
  }

  const whereConditions: Prisma.UserWhereInput = { AND: andConditions };

  const [totalCount, owners] = await Promise.all([
    prisma.user.count({ where: whereConditions }),
    prisma.user.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        apartment: {
          include: {
            availabilities: {
              include: { weekend: true },
              take: 5,
            },
            listingPayment: true,
            reportRented: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
        reportRentedPayments: {
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  const listingFee = config.fees.apartment_listing_fee || 28;
  const reportRentedFee = config.fees.report_rented_fee || 50;

  const formattedOwners = owners.map((owner: any) => {
    const apartment = owner.apartment;
    const listingPayment = apartment?.listingPayment;

    // Listing financial status
    const isListingPaid = listingPayment?.status === PaymentStatus.COMPLETED;
    const listingEarnings = isListingPaid ? listingPayment?.amount || listingFee : 0;
    const listingDue = isListingPaid ? 0 : listingPayment?.amount || listingFee;

    // Report rented metrics
    const reports: any[] = apartment?.reportRented || [];
    const unpaidReports = reports.filter((r) => !r.paidAt);
    const paidReports = reports.filter((r) => !!r.paidAt);

    const unpaidReportsCount = unpaidReports.length;
    const unpaidReportsAmount = unpaidReportsCount * reportRentedFee;

    const paidReportsCount = paidReports.length;
    const paidReportsAmount = paidReportsCount * reportRentedFee;

    // Completed report rented payments
    const completedReportPayments: any[] = (owner.reportRentedPayments || []).filter(
      (p: any) => p.status === PaymentStatus.COMPLETED,
    );
    const reportRentedEarnings =
      completedReportPayments.length > 0
        ? completedReportPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
        : paidReportsAmount;

    // Total calculations (Listing + Report Rented)
    const totalEarnings = listingEarnings + reportRentedEarnings;
    const totalDue = listingDue + unpaidReportsAmount;
    const hasOverduePayment = totalDue > 0;

    return {
      id: owner.id,
      username: owner.username,
      email: owner.email,
      phone: owner.phone,
      profileImage: owner.profileImage,
      status: owner.status,
      isVerified: owner.isVerified,
      notificationPreference: owner.notificationPreference || "EMAIL",
      createdAt: owner.createdAt,
      totalListings: apartment ? 1 : 0,
      apartment: apartment
        ? {
            id: apartment.id,
            propertyId: apartment.propertyId,
            title: apartment.title,
            city: apartment.city,
            address: apartment.address,
            price: apartment.price,
            status: apartment.status,
            phoneNumber: apartment.phoneNumber,
            isKosher: apartment.isKosher,
            isAvailable: apartment.isAvailable,
            availabilities: apartment.availabilities,
            listingPayment: apartment.listingPayment,
          }
        : null,
      financials: {
        totalEarnings,
        totalDue,
        hasOverduePayment,
        listing: {
          isPaid: isListingPaid,
          earnings: listingEarnings,
          due: listingDue,
        },
        reportRented: {
          unpaidCount: unpaidReportsCount,
          unpaidAmount: unpaidReportsAmount,
          paidCount: paidReportsCount,
          paidAmount: paidReportsAmount,
          earnings: reportRentedEarnings,
        },
      },
    };
  });

  // Filter in-memory if hasDue requested
  let result = formattedOwners;
  if (hasDue === "true") {
    result = result.filter((o) => o.financials.hasOverduePayment);
  } else if (hasDue === "false") {
    result = result.filter((o) => !o.financials.hasOverduePayment);
  }

  return {
    meta: {
      page,
      limit,
      total: hasDue !== undefined ? result.length : totalCount,
    },
    data: result,
  };
};

/**
 * Get single owner details with full financial breakdown
 */
const getSingleOwner = async (ownerId: string) => {
  const owner: any = await prisma.user.findUnique({
    where: { id: ownerId, isDeleted: false },
    include: {
      apartment: {
        include: {
          availabilities: { include: { weekend: true } },
          listingPayment: true,
          reportRented: { orderBy: { createdAt: "desc" } },
        },
      },
      reportRentedPayments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!owner) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Owner not found");
  }

  const listingFee = config.fees.apartment_listing_fee || 28;
  const reportRentedFee = config.fees.report_rented_fee || 50;

  const apartment = owner.apartment;
  const listingPayment = apartment?.listingPayment;
  const isListingPaid = listingPayment?.status === PaymentStatus.COMPLETED;
  const listingEarnings = isListingPaid ? listingPayment?.amount || listingFee : 0;
  const listingDue = isListingPaid ? 0 : listingPayment?.amount || listingFee;

  const reports: any[] = apartment?.reportRented || [];
  const unpaidReports = reports.filter((r) => !r.paidAt);
  const paidReports = reports.filter((r) => !!r.paidAt);

  const unpaidReportsCount = unpaidReports.length;
  const unpaidReportsAmount = unpaidReportsCount * reportRentedFee;

  const paidReportsCount = paidReports.length;
  const paidReportsAmount = paidReportsCount * reportRentedFee;

  const completedReportPayments: any[] = (owner.reportRentedPayments || []).filter(
    (p: any) => p.status === PaymentStatus.COMPLETED,
  );
  const reportRentedEarnings =
    completedReportPayments.length > 0
      ? completedReportPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
      : paidReportsAmount;

  const totalEarnings = listingEarnings + reportRentedEarnings;
  const totalDue = listingDue + unpaidReportsAmount;

  return {
    id: owner.id,
    username: owner.username,
    email: owner.email,
    phone: owner.phone,
    profileImage: owner.profileImage,
    status: owner.status,
    isVerified: owner.isVerified,
    notificationPreference: owner.notificationPreference || "EMAIL",
    createdAt: owner.createdAt,
    totalListings: apartment ? 1 : 0,
    apartment,
    financials: {
      totalEarnings,
      totalDue,
      hasOverduePayment: totalDue > 0,
      listing: {
        isPaid: isListingPaid,
        earnings: listingEarnings,
        due: listingDue,
      },
      reportRented: {
        unpaidCount: unpaidReportsCount,
        unpaidAmount: unpaidReportsAmount,
        paidCount: paidReportsCount,
        paidAmount: paidReportsAmount,
        earnings: reportRentedEarnings,
      },
    },
  };
};

/**
 * Send reminder for apartment availability status update:
 * - Reads owner's notificationPreference (EMAIL, PHONE, BOTH)
 * - EMAIL: Sends rich text HTML email
 * - PHONE: Initiates Twilio SIM call bridge connecting admin's phone to owner's SIM
 * - BOTH: Executes both
 */
const sendAvailabilityReminder = async (
  adminId: string,
  ownerId: string,
  payload: ISendReminderPayload,
) => {
  const [admin, owner]: [any, any] = await Promise.all([
    prisma.user.findUnique({ where: { id: adminId } }),
    prisma.user.findUnique({
      where: { id: ownerId, isDeleted: false },
      include: { apartment: true },
    }),
  ]);

  if (!owner) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Owner not found");
  }

  if (!owner.apartment) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "This user does not have an active apartment listing");
  }

  const pref = owner.notificationPreference || "EMAIL";
  const shouldEmail = pref === "EMAIL" || pref === "BOTH";
  const shouldPhone = pref === "PHONE" || pref === "BOTH";

  let emailSent = false;
  let callInitiated = false;
  let callSid: string | null = null;
  const notices: string[] = [];

  // In-app alert notification
  const inAppMessage = `Please update your apartment availability status for "${owner.apartment.title}".`;
  await dispatchNotification({
    title: "Apartment Availability Reminder",
    message: inAppMessage,
    type: AlertType.INFO,
    targetUserId: owner.id,
    link: "/user-dashboard",
    metadata: { apartmentId: owner.apartment.id },
  });

  // 1. Email Channel
  if (shouldEmail) {
    if (owner.email) {
      const subject =
        payload.emailSubject ||
        `Please Update Availability Status for "${owner.apartment.title}" - ShabbosRent`;

      const defaultHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #2563eb;">Apartment Availability Status Update</h2>
          <p>Dear <strong>${owner.username}</strong>,</p>
          <p>Please update the availability status of your apartment <strong>"${owner.apartment.title}"</strong> for the upcoming weekends so guests know when it is open for booking.</p>
          <div style="margin: 24px 0;">
            <a href="https://shabbos-rent-website.vercel.app/user-dashboard" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Update Availability Calendar
            </a>
          </div>
          <p style="font-size: 13px; color: #666;">Thank you for hosting on ShabbosRent.</p>
        </div>
      `;

      const finalHtml = payload.emailBody ? payload.emailBody : defaultHtml;

      try {
        await emailHelper.sendEmail({
          to: owner.email,
          subject,
          html: finalHtml,
        });
        emailSent = true;
      } catch (err: any) {
        notices.push(`Email error: ${err?.message || "Failed to send email"}`);
      }
    } else {
      notices.push("Owner has no email address on file");
    }
  }

  // 2. Phone / Twilio SIM Call Channel
  if (shouldPhone) {
    const ownerPhone = owner.phone || owner.apartment.phoneNumber;
    const adminPhone = payload.adminPhone || admin?.phone || twilioPhoneNumber;

    if (!ownerPhone) {
      notices.push("Owner has no phone number on file for voice call");
    } else if (twilioClient && twilioPhoneNumber) {
      try {
        const twimlUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/v1/call/twiml?to=${encodeURIComponent(ownerPhone)}`;
        const statusCallback = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/v1/call/status-webhook`;

        const call = await twilioClient.calls.create({
          url: twimlUrl,
          to: adminPhone,
          from: twilioPhoneNumber,
          statusCallback,
          statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
          statusCallbackMethod: "POST",
        });

        callInitiated = true;
        callSid = call.sid;

        // Log call to CallLog table
        await prisma.callLog.create({
          data: {
            callerId: adminId,
            receiverId: owner.id,
            apartmentId: owner.apartment.id,
            channel: "VOICE",
            twilioCallSid: call.sid,
            status: call.status || "INITIATED",
          },
        });
      } catch (err: any) {
        notices.push(`Twilio voice error: ${err?.message || "Failed to initiate call bridge"}`);
      }
    } else {
      notices.push("Twilio voice credentials not configured or valid");
    }
  }

  return {
    success: true,
    message: `Availability reminder processed for ${owner.username}`,
    notificationPreference: pref,
    emailSent,
    callInitiated,
    callSid,
    notices: notices.length > 0 ? notices : undefined,
  };
};

/**
 * Send payment due reminder:
 * - Calculates pending dues (Listing fee + Unpaid report rented count * 50)
 * - Reads owner's notificationPreference (EMAIL, PHONE, BOTH)
 * - EMAIL: Sends rich text HTML email with due details and payment link
 * - PHONE: Initiates Twilio SIM call bridge
 * - BOTH: Executes both
 */
const sendPaymentDueReminder = async (
  adminId: string,
  ownerId: string,
  payload: ISendReminderPayload & { amount?: number },
) => {
  const [admin, owner]: [any, any] = await Promise.all([
    prisma.user.findUnique({ where: { id: adminId } }),
    prisma.user.findUnique({
      where: { id: ownerId, isDeleted: false },
      include: {
        apartment: {
          include: {
            listingPayment: true,
            reportRented: true,
          },
        },
      },
    }),
  ]);

  if (!owner) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Owner not found");
  }

  if (!owner.apartment) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "This user does not have an active apartment listing");
  }

  // Calculate actual due
  const listingFee = config.fees.apartment_listing_fee || 28;
  const reportRentedFee = config.fees.report_rented_fee || 50;

  const isListingPaid = owner.apartment.listingPayment?.status === PaymentStatus.COMPLETED;
  const listingDue = isListingPaid ? 0 : owner.apartment.listingPayment?.amount || listingFee;

  const unpaidReports = (owner.apartment.reportRented || []).filter((r: any) => !r.paidAt);
  const reportsDue = unpaidReports.length * reportRentedFee;

  const calculatedTotalDue = listingDue + reportsDue;
  const dueAmount = payload.amount !== undefined ? payload.amount : calculatedTotalDue;

  const pref = owner.notificationPreference || "EMAIL";
  const shouldEmail = pref === "EMAIL" || pref === "BOTH";
  const shouldPhone = pref === "PHONE" || pref === "BOTH";

  let emailSent = false;
  let callInitiated = false;
  let callSid: string | null = null;
  const notices: string[] = [];

  // In-app alert notification
  const inAppMessage = `You have an outstanding payment due of ${dueAmount} ILS on your account. Please log in to complete payment.`;
  await dispatchNotification({
    title: "Payment Due Reminder",
    message: inAppMessage,
    type: AlertType.WARNING,
    targetUserId: owner.id,
    link: "/user-dashboard",
    metadata: {
      dueAmount,
      apartmentId: owner.apartment.id,
    },
  });

  // 1. Email Channel
  if (shouldEmail) {
    if (owner.email) {
      const subject =
        payload.emailSubject ||
        `Payment Reminder: Outstanding Dues of ${dueAmount} ILS - ShabbosRent`;

      const defaultHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #dc2626;">Outstanding Payment Due Reminder</h2>
          <p>Dear <strong>${owner.username}</strong>,</p>
          <p>You have an outstanding payment balance of <strong>${dueAmount} ILS</strong> associated with your apartment <strong>"${owner.apartment.title}"</strong>.</p>
          ${unpaidReports.length > 0 ? `<p>Unpaid Reported Rentals: <strong>${unpaidReports.length}</strong> (${unpaidReports.length * reportRentedFee} ILS)</p>` : ""}
          ${listingDue > 0 ? `<p>Pending Listing Fee: <strong>${listingDue} ILS</strong></p>` : ""}
          <div style="margin: 24px 0;">
            <a href="https://shabbos-rent-website.vercel.app/user-dashboard" style="background-color: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Pay Outstanding Dues Now
            </a>
          </div>
          <p style="font-size: 13px; color: #666;">Thank you for your prompt payment.</p>
        </div>
      `;

      const finalHtml = payload.emailBody ? payload.emailBody : defaultHtml;

      try {
        await emailHelper.sendEmail({
          to: owner.email,
          subject,
          html: finalHtml,
        });
        emailSent = true;
      } catch (err: any) {
        notices.push(`Email error: ${err?.message || "Failed to send email"}`);
      }
    } else {
      notices.push("Owner has no email address on file");
    }
  }

  // 2. Phone / Twilio SIM Call Channel
  if (shouldPhone) {
    const ownerPhone = owner.phone || owner.apartment.phoneNumber;
    const adminPhone = payload.adminPhone || admin?.phone || twilioPhoneNumber;

    if (!ownerPhone) {
      notices.push("Owner has no phone number on file for voice call");
    } else if (twilioClient && twilioPhoneNumber) {
      try {
        const twimlUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/v1/call/twiml?to=${encodeURIComponent(ownerPhone)}`;
        const statusCallback = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/v1/call/status-webhook`;

        const call = await twilioClient.calls.create({
          url: twimlUrl,
          to: adminPhone,
          from: twilioPhoneNumber,
          statusCallback,
          statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
          statusCallbackMethod: "POST",
        });

        callInitiated = true;
        callSid = call.sid;

        await prisma.callLog.create({
          data: {
            callerId: adminId,
            receiverId: owner.id,
            apartmentId: owner.apartment.id,
            channel: "VOICE",
            twilioCallSid: call.sid,
            status: call.status || "INITIATED",
          },
        });
      } catch (err: any) {
        notices.push(`Twilio voice error: ${err?.message || "Failed to initiate call bridge"}`);
      }
    } else {
      notices.push("Twilio voice credentials not configured or valid");
    }
  }

  return {
    success: true,
    message: `Payment due reminder of ${dueAmount} ILS processed for ${owner.username}`,
    dueAmount,
    notificationPreference: pref,
    emailSent,
    callInitiated,
    callSid,
    notices: notices.length > 0 ? notices : undefined,
  };
};

export const OwnerServices = {
  getAllOwners,
  getSingleOwner,
  sendAvailabilityReminder,
  sendPaymentDueReminder,
};
