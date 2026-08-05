import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { prisma } from "../../../helpers/prisma.js";
import { ICreateInterestedRequest } from "./interestedRequest.interface.js";

const createInterestedRequest = async (userId: string, payload: ICreateInterestedRequest) => {
  const apartment = await prisma.apartment.findUnique({
    where: { id: payload.apartmentId },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  if (apartment.userId === userId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "You cannot send an interested request for your own apartment");
  }

  const result = await prisma.interestedRequest.create({
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

const getMyInterestedRequests = async (userId: string) => {
  const sent = await prisma.interestedRequest.findMany({
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

  const received = await prisma.interestedRequest.findMany({
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

export const InterestedRequestServices = {
  createInterestedRequest,
  getMyInterestedRequests,
};
