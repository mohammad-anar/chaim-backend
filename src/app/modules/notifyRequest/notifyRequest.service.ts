import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { prisma } from "../../../helpers/prisma.js";
import { ICreateNotifyRequest } from "./notifyRequest.interface.js";

const createNotifyRequest = async (userId: string, payload: ICreateNotifyRequest) => {
  const apartment = await prisma.apartment.findUnique({
    where: { id: payload.apartmentId },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  if (apartment.userId === userId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "You cannot send a notify request for your own apartment");
  }

  const result = await prisma.notifyRequest.create({
    data: {
      userId,
      ownerId: apartment.userId,
      apartmentId: payload.apartmentId,
    },
    include: {
      apartment: {
        select: {
          id: true,
          title: true,
          city: true,
          neighborhood: true,
          coverImage: true,
        },
      },
    },
  });

  return result;
};

const getMyNotifyRequests = async (userId: string) => {
  const sent = await prisma.notifyRequest.findMany({
    where: { userId },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          profileImage: true,
        },
      },
      apartment: {
        select: {
          id: true,
          title: true,
          city: true,
          neighborhood: true,
          coverImage: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const received = await prisma.notifyRequest.findMany({
    where: { ownerId: userId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          profileImage: true,
        },
      },
      apartment: {
        select: {
          id: true,
          title: true,
          city: true,
          neighborhood: true,
          coverImage: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return { sent, received };
};

export const NotifyRequestServices = {
  createNotifyRequest,
  getMyNotifyRequests,
};
