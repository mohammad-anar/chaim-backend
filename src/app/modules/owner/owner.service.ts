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
  IOwnerNotificationPreferencePayload,
  ISendReminderPayload,
  ISendPaymentReminderPayload,
} from "./owner.interface.js";

const accountSid = config.twilio.account_sid;
const authToken = config.twilio.auth_token;
const twilioPhoneNumber = config.twilio.phone_number || "+97225007890";
const isValidTwilioSid = accountSid?.startsWith("AC");
const twilioClient = isValidTwilioSid && authToken ? twilio(accountSid!, authToken) : null;

const DAYS_OF_WEEK = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

/**
 * Get all owners with rich metrics across all their listings:
 * - totalListings
 * - contact info & ownerNotificationPreference
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
  const { searchTerm, hasDue, status, channel, notificationPreference } = filters;
  const targetChannel = channel || notificationPreference;

  const andConditions: Prisma.UserWhereInput[] = [
    { isDeleted: false },
    { apartments: { some: {} } },
  ];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { username: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
        { phone: { contains: searchTerm, mode: "insensitive" } },
        {
          apartments: {
            some: {
              OR: [
                { title: { contains: searchTerm, mode: "insensitive" } },
                { city: { contains: searchTerm, mode: "insensitive" } },
                { propertyId: { contains: searchTerm, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    });
  }

  if (status) {
    andConditions.push({ status: status as any });
  }

  if (targetChannel) {
    andConditions.push({
      ownerNotificationPreference: {
        channel: targetChannel as any,
      },
    });
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
        ownerNotificationPreference: true,
        apartments: {
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
    const apartments: any[] = owner.apartments || [];

    let totalListingEarnings = 0;
    let totalListingDue = 0;
    let totalUnpaidReportsCount = 0;
    let totalPaidReportsCount = 0;

    apartments.forEach((apt) => {
      const listingPayment = apt.listingPayment;
      const isListingPaid = listingPayment?.status === PaymentStatus.COMPLETED;
      if (isListingPaid) {
        totalListingEarnings += listingPayment?.amount || listingFee;
      } else {
        totalListingDue += listingPayment?.amount || listingFee;
      }

      const reports: any[] = apt.reportRented || [];
      const unpaid = reports.filter((r) => !r.paidAt);
      const paid = reports.filter((r) => !!r.paidAt);
      totalUnpaidReportsCount += unpaid.length;
      totalPaidReportsCount += paid.length;
    });

    const unpaidReportsAmount = totalUnpaidReportsCount * reportRentedFee;
    const paidReportsAmount = totalPaidReportsCount * reportRentedFee;

    const completedReportPayments: any[] = (owner.reportRentedPayments || []).filter(
      (p: any) => p.status === PaymentStatus.COMPLETED,
    );
    const reportRentedEarnings =
      completedReportPayments.length > 0
        ? completedReportPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
        : paidReportsAmount;

    const totalEarnings = totalListingEarnings + reportRentedEarnings;
    const totalDue = totalListingDue + unpaidReportsAmount;
    const hasOverduePayment = totalDue > 0;

    const firstApt = apartments[0] || null;

    return {
      id: owner.id,
      username: owner.username,
      email: owner.email,
      phone: owner.phone,
      profileImage: owner.profileImage,
      status: owner.status,
      isVerified: owner.isVerified,
      notificationPreference: owner.ownerNotificationPreference?.channel || "EMAIL",
      ownerNotificationPreference: owner.ownerNotificationPreference || null,
      createdAt: owner.createdAt,
      totalListings: apartments.length,
      apartment: firstApt
        ? {
            id: firstApt.id,
            propertyId: firstApt.propertyId,
            title: firstApt.title,
            city: firstApt.city,
            phoneNumber: firstApt.phoneNumber,
            status: firstApt.status,
            availabilities: firstApt.availabilities,
            listingPayment: firstApt.listingPayment,
          }
        : null,
      apartments: apartments.map((apt) => ({
        id: apt.id,
        propertyId: apt.propertyId,
        title: apt.title,
        city: apt.city,
        phoneNumber: apt.phoneNumber,
        status: apt.status,
        availabilities: apt.availabilities,
        listingPayment: apt.listingPayment,
      })),
      financials: {
        totalEarnings,
        totalDue,
        hasOverduePayment,
        listing: {
          isPaid: totalListingDue === 0,
          earnings: totalListingEarnings,
          due: totalListingDue,
        },
        reportRented: {
          unpaidCount: totalUnpaidReportsCount,
          unpaidAmount: unpaidReportsAmount,
          paidCount: totalPaidReportsCount,
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
      ownerNotificationPreference: true,
      apartments: {
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

  const apartments: any[] = owner.apartments || [];

  let totalListingEarnings = 0;
  let totalListingDue = 0;
  let totalUnpaidReportsCount = 0;
  let totalPaidReportsCount = 0;

  apartments.forEach((apt) => {
    const listingPayment = apt.listingPayment;
    const isListingPaid = listingPayment?.status === PaymentStatus.COMPLETED;
    if (isListingPaid) {
      totalListingEarnings += listingPayment?.amount || listingFee;
    } else {
      totalListingDue += listingPayment?.amount || listingFee;
    }

    const reports: any[] = apt.reportRented || [];
    const unpaid = reports.filter((r) => !r.paidAt);
    const paid = reports.filter((r) => !!r.paidAt);
    totalUnpaidReportsCount += unpaid.length;
    totalPaidReportsCount += paid.length;
  });

  const unpaidReportsAmount = totalUnpaidReportsCount * reportRentedFee;
  const paidReportsAmount = totalPaidReportsCount * reportRentedFee;

  const completedReportPayments: any[] = (owner.reportRentedPayments || []).filter(
    (p: any) => p.status === PaymentStatus.COMPLETED,
  );
  const reportRentedEarnings =
    completedReportPayments.length > 0
      ? completedReportPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
      : paidReportsAmount;

  const totalEarnings = totalListingEarnings + reportRentedEarnings;
  const totalDue = totalListingDue + unpaidReportsAmount;

  const firstApt = apartments[0] || null;

  return {
    id: owner.id,
    username: owner.username,
    email: owner.email,
    phone: owner.phone,
    profileImage: owner.profileImage,
    status: owner.status,
    isVerified: owner.isVerified,
    notificationPreference: owner.ownerNotificationPreference?.channel || "EMAIL",
    ownerNotificationPreference: owner.ownerNotificationPreference || null,
    createdAt: owner.createdAt,
    totalListings: apartments.length,
    apartment: firstApt,
    apartments,
    financials: {
      totalEarnings,
      totalDue,
      hasOverduePayment: totalDue > 0,
      listing: {
        isPaid: totalListingDue === 0,
        earnings: totalListingEarnings,
        due: totalListingDue,
      },
      reportRented: {
        unpaidCount: totalUnpaidReportsCount,
        unpaidAmount: unpaidReportsAmount,
        paidCount: totalPaidReportsCount,
        paidAmount: paidReportsAmount,
        earnings: reportRentedEarnings,
      },
    },
  };
};

/**
 * Validate if admin can send reminder to owner based on preferences
 */
const validateOwnerReminderPermission = (owner: any) => {
  const pref = owner.ownerNotificationPreference;
  if (!pref) return;

  if (pref.isPaused || pref.allowReminder === false) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Owner has paused/disabled automated reminder notifications",
    );
  }

  // Check preferredDay restriction
  if (pref.preferredDay) {
    const currentDay = DAYS_OF_WEEK[new Date().getDay()];
    if (pref.preferredDay !== currentDay) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Owner has scheduled reminders for ${pref.preferredDay}. Today is ${currentDay}. Reminders cannot be sent on other days.`,
      );
    }
  }

  // Check specificReminderDate restriction
  if (pref.specificReminderDate) {
    const scheduledDate = new Date(pref.specificReminderDate).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    if (scheduledDate !== today) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Owner has scheduled reminder specifically for ${scheduledDate}. Today is ${today}.`,
      );
    }
  }
};

/**
 * Send reminder for apartment availability status update:
 * - Reads owner's ownerNotificationPreference (channel: EMAIL, PHONE, BOTH)
 * - Validates owner's reminder schedule and pause settings
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
      include: { apartments: true, ownerNotificationPreference: true },
    }),
  ]);

  if (!owner) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Owner not found");
  }

  const apartments = owner.apartments || [];
  if (apartments.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "This user does not have any apartment listings");
  }

  // Enforce owner reminder settings
  validateOwnerReminderPermission(owner);

  const targetApartment = payload.apartmentId
    ? apartments.find((a: any) => a.id === payload.apartmentId) || apartments[0]
    : apartments[0];

  const aptTitles = apartments.map((a: any) => `"${a.title}"`).join(", ");

  const pref = payload.channel || owner.ownerNotificationPreference?.channel || "EMAIL";
  const shouldEmail = pref === "EMAIL" || pref === "BOTH";
  const shouldPhone = pref === "PHONE" || pref === "BOTH";

  let emailSent = false;
  let callInitiated = false;
  let callSid: string | null = null;
  const notices: string[] = [];

  // In-app alert notification
  const inAppMessage = payload.apartmentId
    ? `Please update your apartment availability status for "${targetApartment.title}".`
    : `Please update your apartment availability status for ${aptTitles}.`;

  await dispatchNotification({
    title: "Apartment Availability Reminder",
    message: inAppMessage,
    type: AlertType.INFO,
    targetUserId: owner.id,
    link: "/user-dashboard",
    metadata: { apartmentId: targetApartment.id },
  });

  // 1. Email Channel
  if (shouldEmail) {
    const targetEmail = owner.ownerNotificationPreference?.notificationEmail || owner.email;
    if (targetEmail) {
      const subject =
        payload.emailSubject ||
        `Please Update Availability Status for "${targetApartment.title}" - ShabbosRent`;

      const defaultHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #2563eb;">Apartment Availability Status Update</h2>
          <p>Dear <strong>${owner.username}</strong>,</p>
          <p>Please update the availability status of your apartment <strong>"${targetApartment.title}"</strong> for the upcoming weekends so guests know when it is open for booking.</p>
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
          to: targetEmail,
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
    const ownerPhone =
      owner.ownerNotificationPreference?.notificationPhone ||
      owner.phone ||
      targetApartment.phoneNumber;
    const adminPhone = payload.adminPhone || admin?.phone || twilioPhoneNumber;

    if (!ownerPhone) {
      notices.push("Owner has no phone number on file for voice call");
    } else if (twilioClient && twilioPhoneNumber) {
      try {
        const twimlUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/v1/call/twiml?to=${encodeURIComponent(adminPhone)}`;
        const statusCallback = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/v1/call/status-webhook`;

        const call = await twilioClient.calls.create({
          url: twimlUrl,
          to: ownerPhone,
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
            apartmentId: targetApartment.id,
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

  // Record lastReminderSentAt
  await prisma.ownerNotificationPreference.upsert({
    where: { userId: owner.id },
    update: { lastReminderSentAt: new Date() },
    create: { userId: owner.id, lastReminderSentAt: new Date() },
  });

  return {
    success: true,
    message: `Availability reminder processed for ${owner.username}`,
    channelUsed: pref,
    notificationPreference: owner.ownerNotificationPreference?.channel || "EMAIL",
    ownerNotificationPreference: owner.ownerNotificationPreference || null,
    emailSent,
    callInitiated,
    callSid,
    notices: notices.length > 0 ? notices : undefined,
  };
};

/**
 * Send payment due reminder:
 * - Calculates pending dues across owner's listings
 * - Validates owner's reminder schedule and pause settings
 * - EMAIL: Sends rich text HTML email with due details and payment link
 * - PHONE: Initiates Twilio SIM call bridge
 * - BOTH: Executes both
 */
const sendPaymentDueReminder = async (
  adminId: string,
  ownerId: string,
  payload: ISendPaymentReminderPayload,
) => {
  const [admin, owner]: [any, any] = await Promise.all([
    prisma.user.findUnique({ where: { id: adminId } }),
    prisma.user.findUnique({
      where: { id: ownerId, isDeleted: false },
      include: {
        ownerNotificationPreference: true,
        apartments: {
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

  const apartments = owner.apartments || [];
  if (apartments.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "This user does not have any apartment listings");
  }

  // Enforce owner reminder settings
  validateOwnerReminderPermission(owner);

  const listingFee = config.fees.apartment_listing_fee || 28;
  const reportRentedFee = config.fees.report_rented_fee || 50;

  let totalListingDue = 0;
  let totalReportsDue = 0;

  apartments.forEach((apt: any) => {
    const isPaid = apt.listingPayment?.status === PaymentStatus.COMPLETED;
    if (!isPaid) {
      totalListingDue += apt.listingPayment?.amount || listingFee;
    }
    const unpaidReports = (apt.reportRented || []).filter((r: any) => !r.paidAt);
    totalReportsDue += unpaidReports.length * reportRentedFee;
  });

  const calculatedTotalDue = totalListingDue + totalReportsDue;
  const dueAmount = payload.amount !== undefined ? payload.amount : calculatedTotalDue;

  const targetApartment = payload.apartmentId
    ? apartments.find((a: any) => a.id === payload.apartmentId) || apartments[0]
    : apartments[0];

  const pref = payload.channel || owner.ownerNotificationPreference?.channel || "EMAIL";
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
      apartmentId: targetApartment.id,
    },
  });

  // 1. Email Channel
  if (shouldEmail) {
    const targetEmail = owner.ownerNotificationPreference?.notificationEmail || owner.email;
    if (targetEmail) {
      const subject =
        payload.emailSubject ||
        `Payment Reminder: Outstanding Dues of ${dueAmount} ILS - ShabbosRent`;

      const defaultHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #dc2626;">Outstanding Payment Due Reminder</h2>
          <p>Dear <strong>${owner.username}</strong>,</p>
          <p>You have an outstanding payment balance of <strong>${dueAmount} ILS</strong> associated with your apartment listings on ShabbosRent.</p>
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #991b1b;">Total Amount Due: ${dueAmount} ILS</p>
          </div>
          <p>Please log into your owner dashboard and complete your pending payment to ensure uninterrupted service.</p>
          <div style="margin: 24px 0;">
            <a href="https://shabbos-rent-website.vercel.app/user-dashboard" style="background-color: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Complete Payment Now
            </a>
          </div>
          <p style="font-size: 13px; color: #666;">Thank you for your cooperation.<br>ShabbosRent Billing Team</p>
        </div>
      `;

      const finalHtml = payload.emailBody ? payload.emailBody : defaultHtml;

      try {
        await emailHelper.sendEmail({
          to: targetEmail,
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
    const ownerPhone =
      owner.ownerNotificationPreference?.notificationPhone ||
      owner.phone ||
      targetApartment.phoneNumber;
    const adminPhone = payload.adminPhone || admin?.phone || twilioPhoneNumber;

    if (!ownerPhone) {
      notices.push("Owner has no phone number on file for voice call");
    } else if (twilioClient && twilioPhoneNumber) {
      try {
        const twimlUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/v1/call/twiml?to=${encodeURIComponent(adminPhone)}`;
        const statusCallback = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/v1/call/status-webhook`;

        const call = await twilioClient.calls.create({
          url: twimlUrl,
          to: ownerPhone,
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
            apartmentId: targetApartment.id,
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

  // Record lastReminderSentAt
  await prisma.ownerNotificationPreference.upsert({
    where: { userId: owner.id },
    update: { lastReminderSentAt: new Date() },
    create: { userId: owner.id, lastReminderSentAt: new Date() },
  });

  return {
    success: true,
    message: `Payment due reminder of ${dueAmount} ILS processed for ${owner.username}`,
    dueAmount,
    channelUsed: pref,
    notificationPreference: owner.ownerNotificationPreference?.channel || "EMAIL",
    ownerNotificationPreference: owner.ownerNotificationPreference || null,
    emailSent,
    callInitiated,
    callSid,
    notices: notices.length > 0 ? notices : undefined,
  };
};

/**
 * Get current owner's notification preference
 */
const getMyNotificationPref = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
    include: { ownerNotificationPreference: true },
  });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  return (
    user.ownerNotificationPreference || {
      userId: user.id,
      channel: "EMAIL",
      notificationEmail: user.email || null,
      notificationPhone: user.phone || null,
      preferredDay: null,
      preferredTime: null,
      isPaused: false,
      allowReminder: true,
      specificReminderDate: null,
      lastReminderSentAt: null,
    }
  );
};

/**
 * Upsert current owner's notification preference
 */
const upsertMyNotificationPref = async (
  userId: string,
  payload: IOwnerNotificationPreferencePayload,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
  });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  const isPaused = payload.isPaused !== undefined ? payload.isPaused : undefined;
  const allowReminder =
    payload.allowReminder !== undefined
      ? payload.allowReminder
      : isPaused !== undefined
      ? !isPaused
      : undefined;

  let specificReminderDate: Date | null | undefined = undefined;
  if (payload.specificReminderDate !== undefined) {
    if (payload.specificReminderDate === null || payload.specificReminderDate === "") {
      specificReminderDate = null;
    } else {
      const parsed = new Date(payload.specificReminderDate);
      specificReminderDate = !isNaN(parsed.getTime()) ? parsed : null;
    }
  }

  const result = await prisma.ownerNotificationPreference.upsert({
    where: { userId },
    update: {
      ...(payload.channel !== undefined && { channel: payload.channel }),
      ...(payload.notificationEmail !== undefined && {
        notificationEmail: payload.notificationEmail,
      }),
      ...(payload.notificationPhone !== undefined && {
        notificationPhone: payload.notificationPhone,
      }),
      ...(payload.preferredDay !== undefined && {
        preferredDay: payload.preferredDay,
      }),
      ...(payload.preferredTime !== undefined && {
        preferredTime: payload.preferredTime,
      }),
      ...(isPaused !== undefined && { isPaused }),
      ...(allowReminder !== undefined && { allowReminder }),
      ...(specificReminderDate !== undefined && { specificReminderDate }),
    },
    create: {
      userId,
      channel: payload.channel || "EMAIL",
      notificationEmail: payload.notificationEmail ?? user.email ?? null,
      notificationPhone: payload.notificationPhone ?? user.phone ?? null,
      preferredDay: payload.preferredDay || null,
      preferredTime: payload.preferredTime || null,
      isPaused: isPaused ?? false,
      allowReminder: allowReminder ?? true,
      specificReminderDate: specificReminderDate ?? null,
    },
  });

  return result;
};

/**
 * Send an immediate test reminder for owner self-service
 */
const testReminderNow = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
    include: {
      ownerNotificationPreference: true,
      apartments: { take: 1 },
    },
  });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  const pref = user.ownerNotificationPreference?.channel || "EMAIL";
  const shouldEmail = pref === "EMAIL" || pref === "BOTH";
  const shouldPhone = pref === "PHONE" || pref === "BOTH";

  let emailSent = false;
  let callInitiated = false;
  let callSid: string | null = null;
  const notices: string[] = [];

  const aptTitle = user.apartments?.[0]?.title || "your apartment";

  // In-app alert notification
  await dispatchNotification({
    title: "Test Availability Reminder",
    message: `This is a test availability reminder for "${aptTitle}". Your reminder preferences are functioning!`,
    type: AlertType.INFO,
    targetUserId: user.id,
    link: "/user-dashboard",
    metadata: { test: true },
  });

  // 1. Email Channel
  if (shouldEmail) {
    const targetEmail = user.ownerNotificationPreference?.notificationEmail || user.email;
    if (targetEmail) {
      try {
        await emailHelper.sendEmail({
          to: targetEmail,
          subject: "Test Availability Reminder - ShabbosRent",
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2 style="color: #2563eb;">Test Reminder Received</h2>
              <p>Dear <strong>${user.username}</strong>,</p>
              <p>This is a test availability reminder for <strong>"${aptTitle}"</strong>. Your automated reminder preferences are functioning properly.</p>
              <div style="margin: 24px 0;">
                <a href="https://shabbos-rent-website.vercel.app/user-dashboard" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Go to Dashboard
                </a>
              </div>
              <p style="font-size: 13px; color: #666;">ShabbosRent Team</p>
            </div>
          `,
        });
        emailSent = true;
      } catch (err: any) {
        notices.push(`Email error: ${err?.message || "Failed to send email"}`);
      }
    } else {
      notices.push("No email address configured for notifications");
    }
  }

  // 2. Phone / Twilio Voice Channel
  if (shouldPhone) {
    const targetPhone =
      user.ownerNotificationPreference?.notificationPhone ||
      user.phone ||
      user.apartments?.[0]?.phoneNumber;

    if (!targetPhone) {
      notices.push("No phone number configured for notifications");
    } else if (twilioClient && twilioPhoneNumber) {
      try {
        const twimlUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/v1/call/twiml?to=${encodeURIComponent(twilioPhoneNumber)}`;
        const call = await twilioClient.calls.create({
          url: twimlUrl,
          to: targetPhone,
          from: twilioPhoneNumber,
        });
        callInitiated = true;
        callSid = call.sid;
      } catch (err: any) {
        notices.push(`Twilio error: ${err?.message || "Failed to trigger voice call"}`);
      }
    } else {
      notices.push("Twilio voice credentials not configured or valid");
    }
  }

  // Update lastReminderSentAt
  await prisma.ownerNotificationPreference.upsert({
    where: { userId: user.id },
    update: { lastReminderSentAt: new Date() },
    create: {
      userId: user.id,
      channel: pref,
      notificationEmail: user.email || null,
      notificationPhone: user.phone || null,
      lastReminderSentAt: new Date(),
    },
  });

  return {
    success: true,
    message: "Test reminder processed successfully",
    channelUsed: pref,
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
  getMyNotificationPref,
  upsertMyNotificationPref,
  testReminderNow,
};
