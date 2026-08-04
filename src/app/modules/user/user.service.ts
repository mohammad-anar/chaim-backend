import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { prisma } from "../../../helpers/prisma.js";
import { IPaginationOptions } from "../../../types/pagination.js";
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
      wallet: true,
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
      wallet: true,
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

export const UserServices = {
  getMyProfile,
  updateMyProfile,
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
};
