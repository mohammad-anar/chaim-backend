import { Prisma, UserRole, UserStatus, PaymentStatus, AlertType } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { prisma } from "../../../helpers/prisma.js";
import { IPaginationOptions } from "../../../types/pagination.js";
import { dispatchNotification } from "../../../helpers/notificationHelper.js";
import { emailHelper } from "../../../helpers/emailHelper.js";
import { smsHelper } from "../../../helpers/smsHelper.js";
import { IUpdateProfile, IUpdateUserStatus, IUserFilterRequest } from "./user.interface.js";

const getMyProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      profileImage: true,
      role: true,
      status: true,
      isVerified: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
      apartment: {
        include: {
          availabilities: true,
          listingPayment: true,
        },
      },
      marketingEmail: true,
    },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User profile not found");
  }

  return user;
};

const updateMyProfile = async (userId: string, payload: IUpdateProfile) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (payload.username && payload.username !== user.username) {
    const existing = await prisma.user.findUnique({
      where: { username: payload.username },
    });
    if (existing) {
      throw new ApiError(StatusCodes.CONFLICT, "Username already taken");
    }
  }

  if (payload.email && payload.email !== user.email) {
    const existing = await prisma.user.findUnique({
      where: { email: payload.email },
    });
    if (existing) {
      throw new ApiError(StatusCodes.CONFLICT, "Email already taken");
    }
  }

  if (payload.phone && payload.phone !== user.phone) {
    const existing = await prisma.user.findUnique({
      where: { phone: payload.phone },
    });
    if (existing) {
      throw new ApiError(StatusCodes.CONFLICT, "Phone number already taken");
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: payload,
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      profileImage: true,
      role: true,
      status: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

const getAllUsers = async (
  filters: IUserFilterRequest,
  options: IPaginationOptions,
) => {
  const { limit, page, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);
  const { searchTerm, role, status } = filters;

  const andConditions: Prisma.UserWhereInput[] = [];

  andConditions.push({ isDeleted: false });

  if (searchTerm) {
    andConditions.push({
      OR: [
        { username: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
        { phone: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  if (role) {
    andConditions.push({ role });
  }

  if (status) {
    andConditions.push({ status });
  }

  const whereConditions: Prisma.UserWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.user.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      profileImage: true,
      role: true,
      status: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      apartment: {
        select: {
          id: true,
          title: true,
          city: true,
        },
      },
    },
  });

  const total = await prisma.user.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      profileImage: true,
      role: true,
      status: true,
      isVerified: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
      apartment: true,
    },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  return user;
};

const updateUserStatus = async (id: string, payload: IUpdateUserStatus) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { status: payload.status },
    select: {
      id: true,
      username: true,
      email: true,
      status: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

const deleteUser = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  await prisma.user.update({
    where: { id },
    data: { isDeleted: true },
  });

  return { message: "User deleted successfully" };
};

const getAllOwnersAdmin = async (
  filters: { searchTerm?: string; hasDue?: string },
  options: IPaginationOptions,
) => {
  const { limit, page, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const andConditions: Prisma.UserWhereInput[] = [
    { isDeleted: false },
    { apartment: { isNot: null } },
  ];

  if (filters.searchTerm) {
    andConditions.push({
      OR: [
        { username: { contains: filters.searchTerm, mode: "insensitive" } },
        { email: { contains: filters.searchTerm, mode: "insensitive" } },
        { phone: { contains: filters.searchTerm, mode: "insensitive" } },
        {
          apartment: {
            title: { contains: filters.searchTerm, mode: "insensitive" },
          },
        },
        {
          apartment: {
            city: { contains: filters.searchTerm, mode: "insensitive" },
          },
        },
      ],
    });
  }

  const where: Prisma.UserWhereInput = { AND: andConditions };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy:
        sortBy && sortOrder ? { [sortBy]: sortOrder } : { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        profileImage: true,
        status: true,
        createdAt: true,
        apartment: {
          select: {
            id: true,
            propertyId: true,
            title: true,
            city: true,
            neighborhood: true,
            pricePerShabbat: true,
            status: true,
            coverImage: true,
            listingPayment: {
              select: {
                id: true,
                amount: true,
                status: true,
                paidAt: true,
                expiresAt: true,
              },
            },
          },
        },
        reportRentedPayments: {
          where: { status: PaymentStatus.PENDING },
          select: { id: true, amount: true, createdAt: true },
        },
        swapPayments: {
          where: { status: PaymentStatus.PENDING },
          select: { id: true, amount: true, createdAt: true },
        },
      },
    }),
  ]);

  const enrichedOwners = users.map((owner) => {
    const listingPayment = owner.apartment?.listingPayment;
    const isListingPending =
      listingPayment?.status === PaymentStatus.PENDING;
    const listingDueAmount = isListingPending ? listingPayment?.amount || 0 : 0;

    const reportRentedDueAmount = owner.reportRentedPayments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0,
    );
    const swapDueAmount = owner.swapPayments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0,
    );

    const totalDueAmount =
      listingDueAmount + reportRentedDueAmount + swapDueAmount;
    const hasOverduePayment = totalDueAmount > 0;

    return {
      id: owner.id,
      username: owner.username,
      email: owner.email,
      phone: owner.phone,
      profileImage: owner.profileImage,
      status: owner.status,
      createdAt: owner.createdAt,
      apartment: owner.apartment,
      dues: {
        hasOverduePayment,
        totalDueAmount,
        listingDue: {
          isPending: isListingPending,
          amount: listingDueAmount,
        },
        reportRentedDue: {
          pendingCount: owner.reportRentedPayments.length,
          amount: reportRentedDueAmount,
        },
        swapDue: {
          pendingCount: owner.swapPayments.length,
          amount: swapDueAmount,
        },
      },
    };
  });

  // Optional filter in-memory if hasDue is requested
  let finalData = enrichedOwners;
  if (filters.hasDue === "true") {
    finalData = finalData.filter((o) => o.dues.hasOverduePayment);
  } else if (filters.hasDue === "false") {
    finalData = finalData.filter((o) => !o.dues.hasOverduePayment);
  }

  return {
    meta: {
      page,
      limit,
      total: filters.hasDue !== undefined ? finalData.length : total,
    },
    data: finalData,
  };
};

const sendPaymentDueReminder = async (
  ownerId: string,
  payload?: { message?: string; amount?: number },
) => {
  const owner = await prisma.user.findUnique({
    where: { id: ownerId, isDeleted: false },
    include: {
      apartment: {
        include: {
          listingPayment: true,
        },
      },
      reportRentedPayments: {
        where: { status: PaymentStatus.PENDING },
      },
      swapPayments: {
        where: { status: PaymentStatus.PENDING },
      },
    },
  });

  if (!owner) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Owner not found");
  }

  if (!owner.apartment) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "This user is not registered as an apartment owner",
    );
  }

  // Calculate actual pending dues
  const listingDue =
    owner.apartment.listingPayment?.status === PaymentStatus.PENDING
      ? owner.apartment.listingPayment.amount
      : 0;
  const reportDue = owner.reportRentedPayments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0,
  );
  const swapDue = owner.swapPayments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0,
  );
  const calculatedTotalDue = listingDue + reportDue + swapDue;

  const dueAmount =
    payload?.amount !== undefined ? payload.amount : calculatedTotalDue;

  const defaultMsg = `Dear ${owner.username}, you have an outstanding payment due of ${dueAmount} ILS on your account for apartment "${owner.apartment.title}". Please log in to complete payment.`;
  const finalMsg = payload?.message || defaultMsg;

  // In-app alert
  await dispatchNotification({
    title: "Payment Due Reminder",
    message: finalMsg,
    type: AlertType.WARNING,
    targetUserId: owner.id,
    link: "/user-dashboard",
    metadata: {
      dueAmount,
      apartmentId: owner.apartment.id,
    },
  });

  // Email
  if (owner.email) {
    try {
      await emailHelper.sendEmail({
        to: owner.email,
        subject: `Payment Reminder - Outstanding Dues: ${dueAmount} ILS`,
        html: `<p>Dear ${owner.username},</p><p>${finalMsg}</p><p><a href="https://shabbos-rent-website.vercel.app/user-dashboard">Pay Now</a></p>`,
      });
    } catch (err) {
      console.error("Failed to send payment reminder email:", err);
    }
  }

  // SMS
  const phone = owner.phone || owner.apartment.phoneNumber;
  if (phone) {
    try {
      await smsHelper.sendSms({
        to: phone,
        body: `ShabbosRent: ${finalMsg}`,
      });
    } catch (err) {
      console.error("Failed to send payment reminder SMS:", err);
    }
  }

  return {
    dueAmount,
    message: `Payment due reminder of ${dueAmount} ILS dispatched to ${owner.username}`,
  };
};

export const UserServices = {
  getMyProfile,
  updateMyProfile,
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  getAllOwnersAdmin,
  sendPaymentDueReminder,
};
