import { ApartmentStatus, PropertyType, Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { getCache, setCache, deleteCacheByPattern } from "../../../helpers/redis.js";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { prisma } from "../../../helpers/prisma.js";
import { IPaginationOptions } from "../../../types/pagination.js";
import {
  IApartmentFilterRequest,
  ICreateApartment,
  IUpdateApartment,
} from "./apartment.interface.js";

const generatePropertyId = async (): Promise<string> => {
  const count = await prisma.apartment.count();
  let nextNum = count + 1;
  let propertyId = `apart-${String(nextNum).padStart(3, "0")}`;

  let existing = await prisma.apartment.findUnique({
    where: { propertyId },
  });

  while (existing) {
    nextNum++;
    propertyId = `apart-${String(nextNum).padStart(3, "0")}`;
    existing = await prisma.apartment.findUnique({
      where: { propertyId },
    });
  }

  return propertyId;
};

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

  const propertyId = await generatePropertyId();

  const apartment = await prisma.apartment.create({
    data: {
      userId,
      propertyId,
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

  await deleteCacheByPattern("apartment:*");

  return apartment;
};

const isAnyOrEmpty = (val: any): boolean => {
  if (val === undefined || val === null || val === "") return true;
  const str = String(val).trim().toLowerCase();
  return str === "any" || str === "all";
};

const getAllApartments = async (
  filters: IApartmentFilterRequest,
  options: IPaginationOptions,
  isUserAdmin: boolean = false,
) => {
  const cacheKey = `apartment:list:${JSON.stringify(filters)}:${JSON.stringify(options)}:${isUserAdmin}`;
  const cachedData = await getCache<any>(cacheKey);
  if (cachedData) {
    return cachedData;
  }
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
    guestCount,
    weekendId,
    amenities,
    maxWalkingMinutes,
    status,
  } = filters;

  const andConditions: Prisma.ApartmentWhereInput[] = [];

  if (!isUserAdmin) {
    andConditions.push({ status: "CONFIRMED" });
  } else if (!isAnyOrEmpty(status)) {
    andConditions.push({ status: status as ApartmentStatus });
  }

  if (!isAnyOrEmpty(searchTerm)) {
    andConditions.push({
      OR: [
        { propertyId: { contains: String(searchTerm), mode: "insensitive" } },
        { title: { contains: String(searchTerm), mode: "insensitive" } },
        { description: { contains: String(searchTerm), mode: "insensitive" } },
        { city: { contains: String(searchTerm), mode: "insensitive" } },
        { neighborhood: { contains: String(searchTerm), mode: "insensitive" } },
      ],
    });
  }

  if (!isAnyOrEmpty(city)) {
    andConditions.push({ city: { contains: String(city).trim(), mode: "insensitive" } });
  }

  if (!isAnyOrEmpty(neighborhood)) {
    andConditions.push({ neighborhood: { contains: String(neighborhood).trim(), mode: "insensitive" } });
  }

  if (!isAnyOrEmpty(propertyType)) {
    if (Array.isArray(propertyType)) {
      const validTypes = propertyType.filter((pt) => !isAnyOrEmpty(pt)) as PropertyType[];
      if (validTypes.length > 0) {
        andConditions.push({ propertyType: { in: validTypes } });
      }
    } else {
      const typeStr = String(propertyType).trim();
      if (typeStr.includes(",")) {
        const typesList = typeStr
          .split(",")
          .map((t) => t.trim().toUpperCase())
          .filter((t) => Object.values(PropertyType).includes(t as PropertyType)) as PropertyType[];
        if (typesList.length > 0) {
          andConditions.push({ propertyType: { in: typesList } });
        }
      } else {
        const uppercaseType = typeStr.toUpperCase();
        if (Object.values(PropertyType).includes(uppercaseType as PropertyType)) {
          andConditions.push({ propertyType: uppercaseType as PropertyType });
        }
      }
    }
  }

  const parsedMinPrice = !isAnyOrEmpty(minPrice) ? Number(minPrice) : undefined;
  const parsedMaxPrice = !isAnyOrEmpty(maxPrice) ? Number(maxPrice) : undefined;

  if (
    (parsedMinPrice !== undefined && !isNaN(parsedMinPrice)) ||
    (parsedMaxPrice !== undefined && !isNaN(parsedMaxPrice))
  ) {
    andConditions.push({
      pricePerShabbat: {
        ...(parsedMinPrice !== undefined && !isNaN(parsedMinPrice) && { gte: parsedMinPrice }),
        ...(parsedMaxPrice !== undefined && !isNaN(parsedMaxPrice) && { lte: parsedMaxPrice }),
      },
    });
  }

  if (!isAnyOrEmpty(bedrooms) && !isNaN(Number(bedrooms))) {
    andConditions.push({ bedrooms: { gte: Number(bedrooms) } });
  }

  if (!isAnyOrEmpty(bathrooms) && !isNaN(Number(bathrooms))) {
    andConditions.push({ bathrooms: { gte: Number(bathrooms) } });
  }

  const effectiveGuestCount = !isAnyOrEmpty(guestCount) ? guestCount : maxGuest;
  if (!isAnyOrEmpty(effectiveGuestCount) && !isNaN(Number(effectiveGuestCount))) {
    andConditions.push({ maxGuest: { gte: Number(effectiveGuestCount) } });
  }

  if (!isAnyOrEmpty(weekendId)) {
    andConditions.push({
      availabilities: {
        some: {
          weekendId: String(weekendId).trim(),
        },
      },
    });
  }

  if (!isAnyOrEmpty(amenities)) {
    let amenitiesList: string[] = [];
    if (Array.isArray(amenities)) {
      amenitiesList = amenities.map((a) => String(a).trim()).filter((a) => !isAnyOrEmpty(a));
    } else {
      amenitiesList = String(amenities)
        .split(",")
        .map((a) => a.trim())
        .filter((a) => !isAnyOrEmpty(a));
    }

    if (amenitiesList.length > 0) {
      andConditions.push({
        amenities: {
          hasEvery: amenitiesList,
        },
      });
    }
  }

  if (!isAnyOrEmpty(maxWalkingMinutes)) {
    andConditions.push({
      neighborhoodWalkingTime: {
        not: null,
      },
    });
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

  const responseData = {
    meta: {
      page,
      limit,
      total,
    },
    data: dataWithRating,
  };

  await setCache(cacheKey, responseData, 300);

  return responseData;
};

const getApartmentById = async (idOrPropertyId: string) => {
  const cacheKey = `apartment:detail:${idOrPropertyId}`;
  const cached = await getCache<any>(cacheKey);
  if (cached) {
    return cached;
  }
  const apartment = await prisma.apartment.findFirst({
    where: {
      OR: [
        { id: idOrPropertyId },
        { propertyId: idOrPropertyId },
      ],
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

  const result = {
    ...apartment,
    averageRating: Number(avgRating.toFixed(1)),
    totalReviews,
  };

  await setCache(cacheKey, result, 600);

  return result;
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

  await deleteCacheByPattern("apartment:*");

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

  await deleteCacheByPattern("apartment:*");

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

  await deleteCacheByPattern("apartment:*");

  return { message: "Apartment deleted successfully" };
};

const getAdminApartmentDetails = async (idOrPropertyId: string) => {
  const apartment = await prisma.apartment.findFirst({
    where: {
      OR: [
        { id: idOrPropertyId },
        { propertyId: idOrPropertyId },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          profileImage: true,
          createdAt: true,
        },
      },
      availabilities: {
        include: {
          weekend: true,
        },
      },
      swapPreference: true,
      listingPayment: true,
      reportRented: {
        include: {
          payment: true,
          targetApartment: {
            select: {
              id: true,
              propertyId: true,
              title: true,
              city: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
      swappedReportRented: {
        include: {
          apartment: {
            select: {
              id: true,
              propertyId: true,
              title: true,
              city: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          payment: true,
        },
      },
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
      callLogs: {
        include: {
          caller: {
            select: {
              id: true,
              username: true,
              phone: true,
            },
          },
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

export const ApartmentServices = {
  createApartment,
  getMyAppartment,
  getAllApartments,
  getApartmentById,
  getAdminApartmentDetails,
  updateApartment,
  updateApartmentStatus,
  deleteApartment,
};
