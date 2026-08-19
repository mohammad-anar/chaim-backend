import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { parseFlexibleDate } from "../../../helpers/parseDate.js";
import { prisma } from "../../../helpers/prisma.js";
import { IPaginationOptions } from "../../../types/pagination.js";
import {
  ICreateOrUpdateSwapPreference,
  ISwapPreferenceFilterRequest,
} from "./swapPreference.interface.js";

const attachWeekendCalendar = async (preference: any) => {
  if (!preference || !preference.weekend) {
    return preference ? { ...preference, weekendCalendar: null } : preference;
  }

  const prefDate = new Date(preference.weekend);
  const startOfDay = new Date(prefDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(prefDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const weekendCalendar = await prisma.weekendCalendar.findFirst({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      id: true,
      title: true,
      date: true,
    },
  });

  return {
    ...preference,
    weekendCalendar: weekendCalendar || null,
  };
};

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
    const d = parseFlexibleDate(payload.weekend);
    if (!d) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid weekend date format");
    }

    const startOfDay = new Date(d);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(d);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const weekendCalendarRecord = await prisma.weekendCalendar.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (!weekendCalendarRecord) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "The selected weekend date does not exist in the Weekend Calendar. Please select a valid weekend from the calendar.",
      );
    }

    parsedWeekend = weekendCalendarRecord.date;
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

  return await attachWeekendCalendar(result);
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

  return await attachWeekendCalendar(preference);
};

const getAllSwapPreferences = async (
  userId: string,
  filters: ISwapPreferenceFilterRequest,
  options: IPaginationOptions,
) => {
  const userApartment = await prisma.apartment.findUnique({
    where: { userId },
    include: { swapPreference: true },
  });

  if (!userApartment) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You must list an apartment and turn on your swap preference before you can view swappable properties",
    );
  }

  if (!userApartment.swapPreference || !userApartment.swapPreference.isEnabled) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You must turn on your swap preference before you can view swappable properties",
    );
  }

  const { limit, page, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);
  const { city, neighborhood, rooms, beds, isEnabled } = filters;

  const andConditions: Prisma.SwapPreferenceWhereInput[] = [
    { isEnabled: isEnabled !== undefined ? String(isEnabled) === "true" : true },
    { apartmentId: { not: userApartment.id } },
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

  const enrichedData = await Promise.all(
    result.map((p) => attachWeekendCalendar(p)),
  );

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: enrichedData,
  };
};

const getMatchedSwapableProperties = async (
  userId: string,
  options?: IPaginationOptions,
) => {
  const userApartment = await prisma.apartment.findUnique({
    where: { userId },
    include: { swapPreference: true },
  });

  if (!userApartment) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You must list an apartment and turn on your swap preference before you can view swappable properties",
    );
  }

  const pref = userApartment.swapPreference;

  if (!pref || !pref.isEnabled) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You must turn on your swap preference before you can view swappable properties",
    );
  }

  const allPreferences = await prisma.swapPreference.findMany({
    where: {
      isEnabled: true,
      apartmentId: { not: userApartment.id },
    },
    include: {
      apartment: {
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
          availabilities: {
            include: {
              weekend: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

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
    if (pref.weekend) {
      const prefDate = new Date(pref.weekend);
      const hasWeekendAvail = apt.availabilities?.some((avail: any) => {
        if (avail.weekend?.date) {
          const availDate = new Date(avail.weekend.date);
          return (
            availDate.getUTCFullYear() === prefDate.getUTCFullYear() &&
            availDate.getUTCMonth() === prefDate.getUTCMonth() &&
            availDate.getUTCDate() === prefDate.getUTCDate()
          );
        }
        return false;
      });

      if (hasWeekendAvail) {
        score += 15;
      }
    }

    return {
      ...p,
      isMatch: score > 0,
      matchScore: score,
    };
  });

  const matched = scoredData.filter((p) => p.isMatch);
  matched.sort((a, b) => b.matchScore - a.matchScore);

  const unmatched = scoredData.filter((p) => !p.isMatch);

  const isPreferenceMatched = matched.length > 0;

  const { page, limit, skip } = paginationHelper.calculatePagination(options || {});

  const matchedPaginated = matched.slice(skip, skip + limit);
  const unmatchedPaginated = unmatched.slice(skip, skip + limit);
  const allPaginated = scoredData.slice(skip, skip + limit);

  const primaryData = isPreferenceMatched ? matchedPaginated : allPaginated;
  const primaryTotal = isPreferenceMatched ? matched.length : scoredData.length;

  const enrichedUserPreference = await attachWeekendCalendar(pref);

  return {
    isPreferenceMatched,
    hasPreferenceSet: true,
    userPreference: enrichedUserPreference,
    message: isPreferenceMatched
      ? "Swappable properties matched by your preference"
      : "Swap preference not matched. Showing other swappable properties",
    data: primaryData,
    meta: {
      page,
      limit,
      total: primaryTotal,
    },
    matchedProperties: matchedPaginated,
    matchedMeta: {
      page,
      limit,
      total: matched.length,
    },
    otherProperties: isPreferenceMatched ? unmatchedPaginated : allPaginated,
    otherMeta: {
      page,
      limit,
      total: isPreferenceMatched ? unmatched.length : scoredData.length,
    },
  };
};

export const SwapPreferenceServices = {
  createOrUpdateSwapPreference,
  getMySwapPreference,
  getAllSwapPreferences,
  getMatchedSwapableProperties,
};
