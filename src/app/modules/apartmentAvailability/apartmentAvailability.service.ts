import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { prisma } from "../../../helpers/prisma.js";
import { IBulkSetAvailability, IToggleAvailability } from "./apartmentAvailability.interface.js";

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

  return availabilities;
};

export const ApartmentAvailabilityServices = {
  addAvailability,
  removeAvailability,
  bulkSetAvailability,
  getApartmentAvailabilities,
};
