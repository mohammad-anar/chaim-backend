import { MarketingPlatformStatus, Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { prisma } from "../../../helpers/prisma.js";
import { IPaginationOptions } from "../../../types/pagination.js";
import {
  ICreateMarketingPlatformPayload,
  IMarketingPlatformFilterRequest,
  IUpdateMarketingPlatformPayload,
} from "./marketingPlatform.interface.js";

const createMarketingPlatform = async (
  payload: ICreateMarketingPlatformPayload,
) => {
  return await prisma.marketingPlatform.create({
    data: {
      title: payload.title,
      platform: payload.platform,
      status: payload.status || MarketingPlatformStatus.ACTIVE,
    },
  });
};

const getAllMarketingPlatforms = async (
  filters: IMarketingPlatformFilterRequest,
  options: IPaginationOptions,
) => {
  const { limit, page, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);
  const { searchTerm, status, platform } = filters;

  const andConditions: Prisma.MarketingPlatformWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { platform: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  if (status) {
    andConditions.push({ status });
  }

  if (platform) {
    andConditions.push({
      platform: { contains: platform, mode: "insensitive" },
    });
  }

  const whereConditions: Prisma.MarketingPlatformWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.marketingPlatform.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  const total = await prisma.marketingPlatform.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: result,
  };
};

const getActiveMarketingPlatforms = async () => {
  return await prisma.marketingPlatform.findMany({
    where: {
      status: MarketingPlatformStatus.ACTIVE,
    },
    select: {
      id: true,
      title: true,
      platform: true,
      status: true,
      _count: {
        select: {
          users: true,
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });
};

const getMarketingPlatformById = async (id: string) => {
  const platform = await prisma.marketingPlatform.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  if (!platform) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Marketing platform not found");
  }

  return platform;
};

const updateMarketingPlatform = async (
  id: string,
  payload: IUpdateMarketingPlatformPayload,
) => {
  const existing = await prisma.marketingPlatform.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Marketing platform not found");
  }

  return await prisma.marketingPlatform.update({
    where: { id },
    data: payload,
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
  });
};

const deleteMarketingPlatform = async (id: string) => {
  const existing = await prisma.marketingPlatform.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Marketing platform not found");
  }

  return await prisma.marketingPlatform.delete({
    where: { id },
  });
};

export const MarketingPlatformService = {
  createMarketingPlatform,
  getAllMarketingPlatforms,
  getActiveMarketingPlatforms,
  getMarketingPlatformById,
  updateMarketingPlatform,
  deleteMarketingPlatform,
};
