import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { prisma } from "../../../helpers/prisma.js";
import {
  IBulkSetAvailability,
  ISetSpecialWeekend,
  IToggleAvailability,
} from "./apartmentAvailability.interface.js";

const addAvailability = async (userId: string, payload: IToggleAvailability) => {
  const apartment = await prisma.apartment.findUnique({
    where: { id: payload.apartmentId },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  if (apartment.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not own this apartment");
  }

  const weekend = await prisma.weekendCalendar.findUnique({
    where: { id: payload.weekendId },
  });

  if (!weekend) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Weekend calendar entry not found");
  }

  const existing = await prisma.apartmentAvailability.findUnique({
    where: {
      apartmentId_weekendId: {
        apartmentId: payload.apartmentId,
        weekendId: payload.weekendId,
      },
    },
  });

  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, "Apartment is already available for this weekend");
  }

  const result = await prisma.apartmentAvailability.create({
    data: {
      apartmentId: payload.apartmentId,
      weekendId: payload.weekendId,
    },
    include: {
      weekend: true,
      apartment: {
        select: {
          id: true,
          title: true,
          city: true,
        },
      },
    },
  });

  return result;
};

const removeAvailability = async (userId: string, payload: IToggleAvailability) => {
  const apartment = await prisma.apartment.findUnique({
    where: { id: payload.apartmentId },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  if (apartment.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not own this apartment");
  }

  const existing = await prisma.apartmentAvailability.findUnique({
    where: {
      apartmentId_weekendId: {
        apartmentId: payload.apartmentId,
        weekendId: payload.weekendId,
      },
    },
  });

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Availability record not found");
  }

  await prisma.apartmentAvailability.delete({
    where: { id: existing.id },
  });

  return { message: "Availability removed successfully" };
};

const bulkSetAvailability = async (userId: string, payload: IBulkSetAvailability) => {
  const apartment = await prisma.apartment.findUnique({
    where: { id: payload.apartmentId },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  if (apartment.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not own this apartment");
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.apartmentAvailability.deleteMany({
      where: { apartmentId: payload.apartmentId },
    });

    const createData = payload.weekendIds.map((weekendId) => ({
      apartmentId: payload.apartmentId,
      weekendId,
    }));

    await tx.apartmentAvailability.createMany({
      data: createData,
      skipDuplicates: true,
    });

    return tx.apartmentAvailability.findMany({
      where: { apartmentId: payload.apartmentId },
      include: { weekend: true },
    });
  });

  return result;
};

const getApartmentAvailabilities = async (apartmentId: string) => {
  const apartment = await prisma.apartment.findUnique({
    where: { id: apartmentId },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  const availabilities = await prisma.apartmentAvailability.findMany({
    where: { apartmentId },
    include: { weekend: true },
    orderBy: { weekend: { date: "asc" } },
  });

  // Enrich each availability with the effective price for the frontend:
  // use specialPrice when isSpecial=true, otherwise fall back to apartment.pricePerShabbat
  return availabilities.map((av) => ({
    ...av,
    effectivePrice: av.isSpecial && av.specialPrice != null
      ? av.specialPrice
      : apartment.pricePerShabbat,
  }));
};

/**
 * PATCH /:availabilityId/special
 * Let the apartment owner mark a weekend as special and set a custom price.
 * - isSpecial = true  → specialPrice required, stored as-is
 * - isSpecial = false → specialPrice cleared to null automatically
 */
const setSpecialWeekend = async (
  userId: string,
  availabilityId: string,
  payload: ISetSpecialWeekend,
) => {
  // Load the availability record along with its apartment to verify ownership
  const availability = await prisma.apartmentAvailability.findUnique({
    where: { id: availabilityId },
    include: {
      apartment: { select: { userId: true } },
    },
  });

  if (!availability) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Availability record not found");
  }

  if (availability.apartment.userId !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You do not have permission to update this availability",
    );
  }

  const updated = await prisma.apartmentAvailability.update({
    where: { id: availabilityId },
    data: {
      isSpecial: payload.isSpecial,
      // Clear price automatically when turning off special mode
      specialPrice: payload.isSpecial ? payload.specialPrice : null,
    },
    include: { weekend: true },
  });

  return updated;
};

const setSpecialWeekendDirect = async (
  userId: string,
  payload: { apartmentId: string; weekendId: string; isSpecial: boolean; specialPrice?: number },
) => {
  const apartment = await prisma.apartment.findUnique({
    where: { id: payload.apartmentId },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  if (apartment.userId !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You do not have permission to update this apartment availability",
    );
  }

  const updated = await prisma.apartmentAvailability.upsert({
    where: {
      apartmentId_weekendId: {
        apartmentId: payload.apartmentId,
        weekendId: payload.weekendId,
      },
    },
    update: {
      isSpecial: payload.isSpecial,
      specialPrice: payload.isSpecial ? (payload.specialPrice ?? null) : null,
    },
    create: {
      apartmentId: payload.apartmentId,
      weekendId: payload.weekendId,
      isSpecial: payload.isSpecial,
      specialPrice: payload.isSpecial ? (payload.specialPrice ?? null) : null,
    },
    include: { weekend: true },
  });

  return updated;
};

export const ApartmentAvailabilityServices = {
  addAvailability,
  removeAvailability,
  bulkSetAvailability,
  getApartmentAvailabilities,
  setSpecialWeekend,
  setSpecialWeekendDirect,
};
