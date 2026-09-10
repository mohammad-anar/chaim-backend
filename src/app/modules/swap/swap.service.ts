import { SwapStatus, Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { notifyOnSwapAccepted } from "../../../helpers/notificationHelper.js";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { prisma } from "../../../helpers/prisma.js";
import { IPaginationOptions } from "../../../types/pagination.js";
import {
  walkingMinutesToDestination,
  walkingMinutesToNeighborhood,
} from "../../../helpers/distance.js";
import { NEIGHBORHOOD_CENTROIDS } from "../../../config/neighborhoodCentroids.js";
import { ICreateSwapRequest, ISwapFilterRequest } from "./swap.interface.js";

const apartmentComprehensiveSelect = {
  id: true,
  propertyId: true,
  title: true,
  description: true,
  city: true,
  neighborhood: true,
  street1: true,
  street2: true,
  lat: true,
  lng: true,
  neighborhoodLat: true,
  neighborhoodLng: true,
  neighborhoodWalkingMinutes: true,
  propertyType: true,
  bedrooms: true,
  bathrooms: true,
  maxGuest: true,
  pricePerShabbat: true,
  amenities: true,
  coverImage: true,
  images: true,
  phoneNumber: true,
  whatsApp: true,
  howToContact: true,
  additionalDetails: true,
  status: true,
  user: {
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      profileImage: true,
    },
  },
};

const enrichSwap = async (
  swap: any,
  destinationFilter?: { destLat: number; destLng: number; walkingMinutes: number },
) => {
  if (!swap) return swap;

  let weekendCalendar: any = null;
  if (swap.weekend) {
    const prefDate = new Date(swap.weekend);
    const startOfDay = new Date(prefDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(prefDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const record = await prisma.weekendCalendar.findFirst({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
      },
      select: {
        id: true,
        title: true,
        date: true,
      },
    });
    weekendCalendar = record || null;
  }

  const enrichApartment = (apt: any) => {
    if (!apt) return apt;
    const walkingDistanceToNeighborhood = walkingMinutesToNeighborhood(
      apt,
      NEIGHBORHOOD_CENTROIDS,
    );
    const walkingDistanceToDestination = destinationFilter
      ? walkingMinutesToDestination(apt, destinationFilter.destLat, destinationFilter.destLng)
      : undefined;

    return {
      ...apt,
      walkingDistanceToNeighborhood,
      ...(destinationFilter && { walkingDistanceToDestination }),
    };
  };

  return {
    ...swap,
    weekendCalendar,
    fromApartment: enrichApartment(swap.fromApartment),
    toApartment: enrichApartment(swap.toApartment),
  };
};

const createSwapRequest = async (userId: string, payload: ICreateSwapRequest) => {
  const fromApartment = await prisma.apartment.findUnique({
    where: { userId },
    include: { swapPreference: true },
  });

  if (!fromApartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "You have not listed an apartment to swap");
  }

  const fromPref = fromApartment.swapPreference;
  if (!fromPref || !fromPref.isEnabled) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You must enable swap on your apartment before sending a swap request",
    );
  }

  if (!fromPref.weekend) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "You must select a weekend in your swap preference before sending a swap request",
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

  const toPref = toApartment.swapPreference;
  if (!toPref || !toPref.isEnabled) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "The target apartment has not enabled swap");
  }

  if (!toPref.weekend) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "The target apartment has not selected an active swap weekend",
    );
  }

  // Exact weekend match verification
  const fromDate = new Date(fromPref.weekend);
  const toDate = new Date(toPref.weekend);
  const isSameWeekend =
    fromDate.getUTCFullYear() === toDate.getUTCFullYear() &&
    fromDate.getUTCMonth() === toDate.getUTCMonth() &&
    fromDate.getUTCDate() === toDate.getUTCDate();

  if (!isSameWeekend) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Cannot swap: Both apartments must have selected the exact same weekend for swap",
    );
  }

  // Preference match checks: verify toApartment satisfies requester's (fromPref) criteria
  if (fromPref.city && fromPref.city !== "any") {
    if (!toApartment.city.toLowerCase().includes(fromPref.city.toLowerCase())) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Target apartment city (${toApartment.city}) does not match your preferred city (${fromPref.city})`,
      );
    }
  }

  if (fromPref.neighborhood && fromPref.neighborhood !== "any") {
    if (!toApartment.neighborhood.toLowerCase().includes(fromPref.neighborhood.toLowerCase())) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Target apartment neighborhood (${toApartment.neighborhood}) does not match your preferred neighborhood (${fromPref.neighborhood})`,
      );
    }
  }

  if (fromPref.rooms && toApartment.bedrooms < fromPref.rooms) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Target apartment has ${toApartment.bedrooms} rooms, which does not meet your minimum requirement of ${fromPref.rooms} rooms`,
    );
  }

  if (fromPref.beds && toApartment.bathrooms < fromPref.beds) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Target apartment has ${toApartment.bathrooms} beds/baths, which does not meet your minimum requirement of ${fromPref.beds}`,
    );
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
      weekend: fromPref.weekend,
      swapCode,
      status: SwapStatus.PENDING,
    },
    include: {
      fromApartment: { select: apartmentComprehensiveSelect },
      toApartment: { select: apartmentComprehensiveSelect },
      payments: true,
    },
  });

  return await enrichSwap(swap);
};

const getMySwaps = async (userId: string) => {
  const userApartment = await prisma.apartment.findUnique({
    where: { userId },
  });

  if (!userApartment) {
    return { sent: [], received: [] };
  }

  const [sent, received] = await Promise.all([
    prisma.swap.findMany({
      where: { fromAppId: userApartment.id },
      include: {
        payments: true,
        fromApartment: { select: apartmentComprehensiveSelect },
        toApartment: { select: apartmentComprehensiveSelect },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.swap.findMany({
      where: { toAppId: userApartment.id },
      include: {
        payments: true,
        fromApartment: { select: apartmentComprehensiveSelect },
        toApartment: { select: apartmentComprehensiveSelect },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const [enrichedSent, enrichedReceived] = await Promise.all([
    Promise.all(sent.map((s) => enrichSwap(s))),
    Promise.all(received.map((s) => enrichSwap(s))),
  ]);

  return { sent: enrichedSent, received: enrichedReceived };
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
      fromApartment: true,
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
      payments: true,
      fromApartment: { select: apartmentComprehensiveSelect },
      toApartment: { select: apartmentComprehensiveSelect },
    },
  });

  if (status === SwapStatus.APPROVED) {
    // Automatically lock weekend:
    if (swap.weekend) {
      const prefDate = new Date(swap.weekend);
      const startOfDay = new Date(prefDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(prefDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const weekendCalendarRecord = await prisma.weekendCalendar.findFirst({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
        },
      });

      if (weekendCalendarRecord) {
        // Remove from ApartmentAvailability for both apartments so neither can be rented out
        await prisma.apartmentAvailability.deleteMany({
          where: {
            weekendId: weekendCalendarRecord.id,
            apartmentId: { in: [swap.fromAppId, swap.toAppId] },
          },
        });
      }

      // Reset / disable swap preference for both apartments to prevent double-swapping
      await prisma.swapPreference.updateMany({
        where: {
          apartmentId: { in: [swap.fromAppId, swap.toAppId] },
        },
        data: {
          isEnabled: false,
          weekend: null,
        },
      });
    }

    await notifyOnSwapAccepted({
      swapId: result.id,
      swapCode: result.swapCode,
      fromApartmentTitle: result.fromApartment.title,
      toApartmentTitle: result.toApartment.title,
      fromUserId: result.fromApartment.user.id,
      toUserId: result.toApartment.user.id,
    });
  }

  return await enrichSwap(result);
};

const getAllSwapsAdmin = async (
  filters: ISwapFilterRequest,
  options: IPaginationOptions,
) => {
  const { limit, page, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const andConditions: Prisma.SwapWhereInput[] = [];

  if (filters.status) {
    andConditions.push({ status: filters.status });
  }

  if (filters.searchTerm) {
    andConditions.push({
      OR: [
        { swapCode: { contains: filters.searchTerm, mode: "insensitive" } },
        { fromApartment: { title: { contains: filters.searchTerm, mode: "insensitive" } } },
        { toApartment: { title: { contains: filters.searchTerm, mode: "insensitive" } } },
        { fromApartment: { city: { contains: filters.searchTerm, mode: "insensitive" } } },
        { toApartment: { city: { contains: filters.searchTerm, mode: "insensitive" } } },
      ],
    });
  }

  // Destination mode
  const parsedDestLat = filters.destLat !== undefined ? Number(filters.destLat) : NaN;
  const parsedDestLng = filters.destLng !== undefined ? Number(filters.destLng) : NaN;
  const parsedWalkingMinutes = filters.walkingMinutes !== undefined ? Number(filters.walkingMinutes) : NaN;
  const isDestinationMode =
    !isNaN(parsedDestLat) && !isNaN(parsedDestLng) && !isNaN(parsedWalkingMinutes);

  if (!isDestinationMode) {
    if (filters.city && filters.city !== "any") {
      andConditions.push({
        OR: [
          { fromApartment: { city: { contains: filters.city, mode: "insensitive" } } },
          { toApartment: { city: { contains: filters.city, mode: "insensitive" } } },
        ],
      });
    }
    if (filters.neighborhood && filters.neighborhood !== "any") {
      andConditions.push({
        OR: [
          { fromApartment: { neighborhood: { contains: filters.neighborhood, mode: "insensitive" } } },
          { toApartment: { neighborhood: { contains: filters.neighborhood, mode: "insensitive" } } },
        ],
      });
    }
  }

  const where: Prisma.SwapWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const destinationFilter = isDestinationMode
    ? { destLat: parsedDestLat, destLng: parsedDestLng, walkingMinutes: parsedWalkingMinutes }
    : undefined;

  const [total, swaps] = await Promise.all([
    prisma.swap.count({ where }),
    prisma.swap.findMany({
      where,
      skip: isDestinationMode ? undefined : skip,
      take: isDestinationMode ? undefined : limit,
      orderBy: sortBy && sortOrder ? { [sortBy]: sortOrder } : { createdAt: "desc" },
      include: {
        fromApartment: { select: apartmentComprehensiveSelect },
        toApartment: { select: apartmentComprehensiveSelect },
        payments: true,
      },
    }),
  ]);

  let enrichedSwaps = await Promise.all(
    swaps.map((s) => enrichSwap(s, destinationFilter)),
  );

  if (isDestinationMode) {
    enrichedSwaps = enrichedSwaps.filter((s) => {
      const fromMins = s.fromApartment?.walkingDistanceToDestination;
      const toMins = s.toApartment?.walkingDistanceToDestination;
      return (
        (fromMins !== undefined && fromMins !== null && fromMins <= parsedWalkingMinutes) ||
        (toMins !== undefined && toMins !== null && toMins <= parsedWalkingMinutes)
      );
    });

    const paginated = enrichedSwaps.slice(skip, skip + limit);
    return {
      meta: {
        page,
        limit,
        total: enrichedSwaps.length,
      },
      data: paginated,
    };
  }

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: enrichedSwaps,
  };
};

const updateSwapStatusAdmin = async (
  swapId: string,
  status: SwapStatus,
) => {
  const swap = await prisma.swap.findUnique({
    where: { id: swapId },
    include: {
      fromApartment: true,
      toApartment: true,
    },
  });

  if (!swap) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Swap request not found");
  }

  const result = await prisma.swap.update({
    where: { id: swapId },
    data: { status },
    include: {
      payments: true,
      fromApartment: { select: apartmentComprehensiveSelect },
      toApartment: { select: apartmentComprehensiveSelect },
    },
  });

  if (status === SwapStatus.APPROVED) {
    if (swap.weekend) {
      const prefDate = new Date(swap.weekend);
      const startOfDay = new Date(prefDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(prefDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const weekendCalendarRecord = await prisma.weekendCalendar.findFirst({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
        },
      });

      if (weekendCalendarRecord) {
        await prisma.apartmentAvailability.deleteMany({
          where: {
            weekendId: weekendCalendarRecord.id,
            apartmentId: { in: [swap.fromAppId, swap.toAppId] },
          },
        });
      }

      await prisma.swapPreference.updateMany({
        where: {
          apartmentId: { in: [swap.fromAppId, swap.toAppId] },
        },
        data: {
          isEnabled: false,
          weekend: null,
        },
      });
    }

    await notifyOnSwapAccepted({
      swapId: result.id,
      swapCode: result.swapCode,
      fromApartmentTitle: result.fromApartment.title,
      toApartmentTitle: result.toApartment.title,
      fromUserId: result.fromApartment.user.id,
      toUserId: result.toApartment.user.id,
    });
  }

  return await enrichSwap(result);
};

export const SwapServices = {
  createSwapRequest,
  getMySwaps,
  updateSwapStatus,
  getAllSwapsAdmin,
  updateSwapStatusAdmin,
};
