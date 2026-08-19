import { SwapStatus } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { prisma } from "../../../helpers/prisma.js";
import { ICreateSwapRequest } from "./swap.interface.js";

const createSwapRequest = async (userId: string, payload: ICreateSwapRequest) => {
  const fromApartment = await prisma.apartment.findUnique({
    where: { userId },
    include: { swapPreference: true },
  });

  if (!fromApartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "You have not listed an apartment to swap");
  }

  if (!fromApartment.swapPreference || !fromApartment.swapPreference.isEnabled) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You must enable swap on your apartment before sending a swap request",
    );
  }

  if (fromApartment.id === payload.toAppId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "You cannot swap with your own apartment");
  }

  const toApartment = await prisma.apartment.findUnique({
    where: { id: payload.toAppId },
    include: { swapPreference: true },
  });

  if (!toApartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Target apartment for swap not found");
  }

  if (!toApartment.swapPreference || !toApartment.swapPreference.isEnabled) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "The target apartment has not enabled swap");
  }

  const existingSwap = await prisma.swap.findFirst({
    where: {
      fromAppId: fromApartment.id,
      toAppId: payload.toAppId,
      status: SwapStatus.PENDING,
    },
  });

  if (existingSwap) {
    throw new ApiError(StatusCodes.CONFLICT, "A pending swap request already exists for this apartment");
  }

  const swapCode = `SWAP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const swap = await prisma.swap.create({
    data: {
      fromAppId: fromApartment.id,
      toAppId: payload.toAppId,
      swapCode,
      status: SwapStatus.PENDING,
    },
    include: {
      fromApartment: {
        select: {
          id: true,
          title: true,
          city: true,
          neighborhood: true,
          coverImage: true,
        },
      },
      toApartment: {
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

  return swap;
};

const getMySwaps = async (userId: string) => {
  const userApartment = await prisma.apartment.findUnique({
    where: { userId },
  });

  if (!userApartment) {
    return { sent: [], received: [] };
  }

  const sent = await prisma.swap.findMany({
    where: { fromAppId: userApartment.id },
    include: {
      toApartment: {
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
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const received = await prisma.swap.findMany({
    where: { toAppId: userApartment.id },
    include: {
      fromApartment: {
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
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return { sent, received };
};

const updateSwapStatus = async (
  userId: string,
  swapId: string,
  status: SwapStatus,
) => {
  const swap = await prisma.swap.findUnique({
    where: { id: swapId },
    include: {
      toApartment: true,
    },
  });

  if (!swap) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Swap request not found");
  }

  if (swap.toApartment.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only the recipient of the swap request can update its status");
  }

  const result = await prisma.swap.update({
    where: { id: swapId },
    data: { status },
    include: {
      fromApartment: true,
      toApartment: true,
    },
  });

  return result;
};

export const SwapServices = {
  createSwapRequest,
  getMySwaps,
  updateSwapStatus,
};
