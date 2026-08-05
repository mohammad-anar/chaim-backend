import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { prisma } from "../../../helpers/prisma.js";
import { IPaginationOptions } from "../../../types/pagination.js";
import {
  ICreateOrUpdateSwapPreference,
  ISwapPreferenceFilterRequest,
} from "./swapPreference.interface.js";

const createOrUpdateSwapPreference = async (
  userId: string,
  payload: ICreateOrUpdateSwapPreference,
) => {
  const apartment = await prisma.apartment.findUnique({
    where: { userId },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "You have not listed an apartment yet");
  }

  let parsedWeekend: Date | undefined = undefined;
  if (payload.weekend) {
    const d = new Date(payload.weekend);
    if (!isNaN(d.getTime())) {
      parsedWeekend = d;
    }
  }

  const result = await prisma.swapPreference.upsert({
    where: { apartmentId: apartment.id },
    create: {
      apartmentId: apartment.id,
      isEnabled: payload.isEnabled ?? true,
      city: payload.city,
      neighborhood: payload.neighborhood,
      rooms: payload.rooms,
      beds: payload.beds,
      weekend: parsedWeekend,
      whatsApp: payload.whatsApp,
      email: payload.email,
    },
    update: {
      ...(payload.isEnabled !== undefined && { isEnabled: payload.isEnabled }),
      ...(payload.city !== undefined && { city: payload.city }),
      ...(payload.neighborhood !== undefined && { neighborhood: payload.neighborhood }),
      ...(payload.rooms !== undefined && { rooms: payload.rooms }),
      ...(payload.beds !== undefined && { beds: payload.beds }),
      ...(parsedWeekend !== undefined && { weekend: parsedWeekend }),
      ...(payload.whatsApp !== undefined && { whatsApp: payload.whatsApp }),
      ...(payload.email !== undefined && { email: payload.email }),
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

const getMySwapPreference = async (userId: string) => {
  const apartment = await prisma.apartment.findUnique({
    where: { userId },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "You have not listed an apartment yet");
  }

  const preference = await prisma.swapPreference.findUnique({
    where: { apartmentId: apartment.id },
    include: {
      apartment: true,
    },
  });

  if (!preference) {
    throw new ApiError(StatusCodes.NOT_FOUND, "No swap preference found for your apartment");
  }

  return preference;
};

const getAllSwapPreferences = async (
  filters: ISwapPreferenceFilterRequest,
  options: IPaginationOptions,
) => {
  const { limit, page, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);
  const { city, neighborhood, rooms, beds, isEnabled } = filters;

  const andConditions: Prisma.SwapPreferenceWhereInput[] = [
    { isEnabled: isEnabled !== undefined ? String(isEnabled) === "true" : true },
  ];

  if (city && city !== "any") {
    andConditions.push({ city: { contains: city, mode: "insensitive" } });
  }

  if (neighborhood && neighborhood !== "any") {
    andConditions.push({ neighborhood: { contains: neighborhood, mode: "insensitive" } });
  }

  if (rooms && !isNaN(Number(rooms))) {
    andConditions.push({ rooms: { gte: Number(rooms) } });
  }

  if (beds && !isNaN(Number(beds))) {
    andConditions.push({ beds: { gte: Number(beds) } });
  }

  const whereConditions: Prisma.SwapPreferenceWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.swapPreference.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
    include: {
      apartment: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });

  const total = await prisma.swapPreference.count({
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

const getMatchedSwapableProperties = async (userId: string) => {
  const userApartment = await prisma.apartment.findUnique({
    where: { userId },
    include: { swapPreference: true },
  });

  const pref = userApartment?.swapPreference;

  const allPreferences = await prisma.swapPreference.findMany({
    where: {
      isEnabled: true,
      ...(userApartment && { apartmentId: { not: userApartment.id } }),
    },
    include: {
      apartment: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });

  if (!pref) {
    return {
      hasPreferenceSet: false,
      data: allPreferences.map((p) => ({ ...p, isMatch: false, matchScore: 0 })),
    };
  }

  const scoredData = allPreferences.map((p) => {
    let score = 0;
    const apt = p.apartment;

    if (pref.city && apt.city.toLowerCase().includes(pref.city.toLowerCase())) {
      score += 10;
    }
    if (pref.neighborhood && apt.neighborhood.toLowerCase().includes(pref.neighborhood.toLowerCase())) {
      score += 5;
    }
    if (pref.rooms && apt.bedrooms >= pref.rooms) {
      score += 3;
    }
    if (pref.beds && apt.bathrooms >= pref.beds) {
      score += 2;
    }

    return {
      ...p,
      isMatch: score > 0,
      matchScore: score,
    };
  });

  scoredData.sort((a, b) => b.matchScore - a.matchScore);

  return {
    hasPreferenceSet: true,
    userPreference: pref,
    data: scoredData,
  };
};

export const SwapPreferenceServices = {
  createOrUpdateSwapPreference,
  getMySwapPreference,
  getAllSwapPreferences,
  getMatchedSwapableProperties,
};
