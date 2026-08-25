import { AdvertisementPosition, Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { prisma } from "../../../helpers/prisma.js";
import {
  ICreateAdvertisementPayload,
  IUpdateAdvertisementPayload,
} from "./advertisement.interface.js";

const createAdvertisement = async (payload: ICreateAdvertisementPayload) => {
  return await prisma.advertisement.create({
    data: {
      title: payload.title,
      image: payload.image,
      targetUrl: payload.targetUrl || null,
      position: payload.position || AdvertisementPosition.HOME_TOP,
      isActive: payload.isActive !== undefined ? payload.isActive : true,
      startDate: payload.startDate ? new Date(payload.startDate) : null,
      endDate: payload.endDate ? new Date(payload.endDate) : null,
    },
  });
};

const getAllAdvertisements = async (query: {
  position?: AdvertisementPosition;
  isActive?: string;
}) => {
  const where: Prisma.AdvertisementWhereInput = {};

  if (query.position) {
    where.position = query.position;
  }

  if (query.isActive !== undefined) {
    where.isActive = query.isActive === "true";
  }

  return await prisma.advertisement.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
};

const getAdvertisementById = async (id: string) => {
  const ad = await prisma.advertisement.findUnique({
    where: { id },
  });

  if (!ad) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Advertisement not found");
  }

  return ad;
};

const recordClick = async (id: string) => {
  const ad = await prisma.advertisement.findUnique({ where: { id } });
  if (!ad) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Advertisement not found");
  }

  return await prisma.advertisement.update({
    where: { id },
    data: { clicks: { increment: 1 } },
  });
};

const updateAdvertisement = async (
  id: string,
  payload: IUpdateAdvertisementPayload,
) => {
  const existing = await prisma.advertisement.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Advertisement not found");
  }

  const data: any = { ...payload };
  if (payload.startDate) data.startDate = new Date(payload.startDate);
  if (payload.endDate) data.endDate = new Date(payload.endDate);

  return await prisma.advertisement.update({
    where: { id },
    data,
  });
};

const deleteAdvertisement = async (id: string) => {
  const existing = await prisma.advertisement.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Advertisement not found");
  }

  return await prisma.advertisement.delete({
    where: { id },
  });
};

export const AdvertisementService = {
  createAdvertisement,
  getAllAdvertisements,
  getAdvertisementById,
  recordClick,
  updateAdvertisement,
  deleteAdvertisement,
};
