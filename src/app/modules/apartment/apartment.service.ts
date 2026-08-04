import { ApartmentStatus, Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { prisma } from "../../../helpers/prisma.js";
import { IPaginationOptions } from "../../../types/pagination.js";
import {
  IApartmentFilterRequest,
  ICreateApartment,
  IUpdateApartment,
} from "./apartment.interface.js";

const createApartment = async (
  userId: string,
  payload: ICreateApartment,
) => {
  const existingApartment = await prisma.apartment.findUnique({
    where: { userId },
  });

  if (existingApartment) {
    throw new ApiError(StatusCodes.CONFLICT, "You can list only one apartment");
  }

  let walkingTime: Date | null = null;
  if (payload.neighborhoodWalkingTime) {
    const parsed = new Date(payload.neighborhoodWalkingTime);
    if (!isNaN(parsed.getTime())) {
      walkingTime = parsed;
    }
  }

  const apartment = await prisma.apartment.create({
    data: {
      userId,
      title: payload.title,
      description: payload.description,
      city: payload.city,
      neighborhood: payload.neighborhood,
      street1: payload.street1,
      street2: payload.street2,
      lat: payload.lat,
      lng: payload.lng,
      propertyType: payload.propertyType,
      bedrooms: payload.bedrooms,
      bathrooms: payload.bathrooms,
      maxGuest: payload.maxGuest,
      pricePerShabbat: payload.pricePerShabbat,
      neighborhoodWalkingTime: walkingTime,
      amenities: payload.amenities || [],
      coverImage: payload.coverImage,
      images: payload.images || [],
      phoneNumber: payload.phoneNumber,
      whatsApp: payload.whatsApp,
      howToContact: payload.howToContact || "BOTH",
      additionalDetails: payload.additionalDetails,
      status: "PENDING",
    },
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
  });

  return apartment;
};

const getMyAppartment = async (userId: string) => {
  const apartment = await prisma.apartment.findUnique({
    where: { userId },
    include: {
      availabilities: {
        include: {
          weekend: true,
        },
      },
      listingPayment: true,
      swapPreference: true,
      reviews: {
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

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "You have not listed an apartment yet");
  }

  return apartment;
};

const getAllApartments = async (
  filters: IApartmentFilterRequest,
  options: IPaginationOptions,
  isUserAdmin: boolean = false,
) => {
  const { limit, page, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);
  const {
    searchTerm,
    city,
    neighborhood,
    propertyType,
    minPrice,
    maxPrice,
    bedrooms,
    bathrooms,
    maxGuest,
    status,
  } = filters;

  const andConditions: Prisma.ApartmentWhereInput[] = [];

  if (!isUserAdmin) {
    andConditions.push({ status: "CONFIRMED" });
  } else if (status) {
    andConditions.push({ status });
  }

  if (searchTerm) {
    andConditions.push({
      OR: [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        { city: { contains: searchTerm, mode: "insensitive" } },
        { neighborhood: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  if (city) {
    andConditions.push({ city: { contains: city, mode: "insensitive" } });
  }

  if (neighborhood) {
    andConditions.push({ neighborhood: { contains: neighborhood, mode: "insensitive" } });
  }

  if (propertyType) {
    andConditions.push({ propertyType });
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    andConditions.push({
      pricePerShabbat: {
        ...(minPrice !== undefined && { gte: Number(minPrice) }),
        ...(maxPrice !== undefined && { lte: Number(maxPrice) }),
      },
    });
  }

  if (bedrooms !== undefined) {
    andConditions.push({ bedrooms: { gte: Number(bedrooms) } });
  }

  if (bathrooms !== undefined) {
    andConditions.push({ bathrooms: { gte: Number(bathrooms) } });
  }

  if (maxGuest !== undefined) {
    andConditions.push({ maxGuest: { gte: Number(maxGuest) } });
  }

  const whereConditions: Prisma.ApartmentWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.apartment.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
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
      reviews: {
        select: {
          rating: true,
        },
      },
    },
  });

  const total = await prisma.apartment.count({
    where: whereConditions,
  });

  const dataWithRating = result.map((apt) => {
    const totalReviews = apt.reviews.length;
    const avgRating =
      totalReviews > 0
        ? apt.reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews
        : 0;

    return {
      ...apt,
      averageRating: Number(avgRating.toFixed(1)),
      totalReviews,
    };
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: dataWithRating,
  };
};

const getApartmentById = async (id: string) => {
  const apartment = await prisma.apartment.findUnique({
    where: { id },
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
      swapPreference: true,
      reviews: {
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
      listingPayment: {
        select: {
          status: true,
          paidAt: true,
        },
      },
    },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  const totalReviews = apartment.reviews.length;
  const avgRating =
    totalReviews > 0
      ? apartment.reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews
      : 0;

  return {
    ...apartment,
    averageRating: Number(avgRating.toFixed(1)),
    totalReviews,
  };
};

const updateApartment = async (
  userId: string,
  apartmentId: string,
  payload: IUpdateApartment,
) => {
  const apartment = await prisma.apartment.findUnique({
    where: { id: apartmentId },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  if (apartment.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not own this apartment");
  }

  const updateData: any = { ...payload };

  if (payload.neighborhoodWalkingTime) {
    const parsed = new Date(payload.neighborhoodWalkingTime);
    if (!isNaN(parsed.getTime())) {
      updateData.neighborhoodWalkingTime = parsed;
    }
  }

  const result = await prisma.apartment.update({
    where: { id: apartmentId },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          profileImage: true,
        },
      },
      availabilities: true,
    },
  });

  return result;
};

const updateApartmentStatus = async (
  id: string,
  status: ApartmentStatus,
) => {
  const apartment = await prisma.apartment.findUnique({
    where: { id },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  const result = await prisma.apartment.update({
    where: { id },
    data: { status },
  });

  return result;
};

const deleteApartment = async (
  userId: string,
  apartmentId: string,
  isAdmin: boolean = false,
) => {
  const apartment = await prisma.apartment.findUnique({
    where: { id: apartmentId },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  if (!isAdmin && apartment.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not own this apartment");
  }

  await prisma.apartment.delete({
    where: { id: apartmentId },
  });

  return { message: "Apartment deleted successfully" };
};

export const ApartmentServices = {
  createApartment,
  getMyAppartment,
  getAllApartments,
  getApartmentById,
  updateApartment,
  updateApartmentStatus,
  deleteApartment,
};
