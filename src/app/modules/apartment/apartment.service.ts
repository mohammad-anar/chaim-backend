import { ApartmentStatus, PropertyType, Prisma, AlertType } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { getCache, setCache, deleteCacheByPattern } from "../../../helpers/redis.js";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { prisma } from "../../../helpers/prisma.js";
import { IPaginationOptions } from "../../../types/pagination.js";
import {
  dispatchNotification,
  notifyAdminOnApartmentAdded,
  notifyOnAmbassadorAttribution,
} from "../../../helpers/notificationHelper.js";
import { emailHelper } from "../../../helpers/emailHelper.js";
import { smsHelper } from "../../../helpers/smsHelper.js";
import { walkingMinutesToDestination, walkingMinutesToNeighborhood } from "../../../helpers/distance.js";
import { NEIGHBORHOOD_CENTROIDS } from "../../../config/neighborhoodCentroids.js";
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
  let walkingTime: Date | null = null;
  if (payload.neighborhoodWalkingTime) {
    const parsed = new Date(payload.neighborhoodWalkingTime);
    if (!isNaN(parsed.getTime())) {
      walkingTime = parsed;
    }
  }

  const propertyId = await generatePropertyId();

  const toFloatOrNull = (val: any) =>
    val !== undefined && val !== null && val !== "" && !isNaN(Number(val)) ? Number(val) : null;
  const toIntOrNull = (val: any) =>
    val !== undefined && val !== null && val !== "" && !isNaN(Number(val)) ? Math.round(Number(val)) : null;

  let amenities: string[] = [];
  if (Array.isArray(payload.amenities)) {
    amenities = payload.amenities;
  } else if (typeof payload.amenities === "string") {
    try {
      const parsed = JSON.parse(payload.amenities);
      if (Array.isArray(parsed)) amenities = parsed;
    } catch {
      amenities = (payload.amenities as string).split(",").map((s: string) => s.trim()).filter(Boolean);
    }
  }

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
      lat: toFloatOrNull(payload.lat),
      lng: toFloatOrNull(payload.lng),
      propertyType: payload.propertyType,
      bedrooms: Number(payload.bedrooms),
      bathrooms: Number(payload.bathrooms),
      maxGuest: Number(payload.maxGuest),
      pricePerShabbat: Number(payload.pricePerShabbat),
      neighborhoodWalkingTime: walkingTime,
      neighborhoodLat: toFloatOrNull(payload.neighborhoodLat),
      neighborhoodLng: toFloatOrNull(payload.neighborhoodLng),
      neighborhoodWalkingMinutes: toIntOrNull(payload.neighborhoodWalkingMinutes),
      amenities,
      coverImage: payload.coverImage,
      images: payload.images || [],
      phoneNumber: payload.phoneNumber,
      whatsApp: payload.whatsApp,
      phone: payload.phone !== undefined ? Boolean(payload.phone) : true,
      whatsapp: payload.whatsapp !== undefined ? Boolean(payload.whatsapp) : false,
      email: payload.email !== undefined ? Boolean(payload.email) : false,
      unavailable: payload.unavailable !== undefined ? Boolean(payload.unavailable) : false,
      receiveRequestWhenUnavailable: payload.receiveRequestWhenUnavailable !== undefined ? Boolean(payload.receiveRequestWhenUnavailable) : false,
      isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
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

  // Handle Ambassador Attribution
  try {
    const ownerPhone = (payload.phoneNumber || apartment.user.phone || "").replace(/\D/g, "");
    const ownerEmail = (apartment.user.email || "").trim().toLowerCase();

    // 1. If referral code was supplied
    if (payload.referralCode && payload.referralCode.trim() !== "") {
      const ambassador = await prisma.ambassador.findUnique({
        where: { referralCode: payload.referralCode.trim().toUpperCase() },
      });

      if (ambassador && ambassador.status === "ACTIVE") {
        const now = new Date();
        const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        await prisma.ambassadorAttribution.create({
          data: {
            apartmentId: apartment.id,
            ambassadorId: ambassador.id,
            apartmentTitle: apartment.title,
            ownerName: apartment.user.username,
            ownerPhone: ownerPhone,
            ownerEmail: ownerEmail || null,
            model: null,
            modelDeadline: deadline,
            method: "LINK",
            status: "ACTIVE",
            listingCreatedAt: now,
          },
        });

        // Notify Admin and Ambassador
        await notifyOnAmbassadorAttribution({
          ambassadorId: ambassador.id,
          ambassadorName: ambassador.name,
          apartmentId: apartment.id,
          apartmentTitle: apartment.title,
          ownerName: apartment.user.username,
          referralCode: ambassador.referralCode || "",
        });
      }
    } else {
      // 2. Check if a manual claim exists for this owner phone/email without an apartmentId
      const pendingManualClaim = await prisma.ambassadorAttribution.findFirst({
        where: {
          apartmentId: null,
          status: "ACTIVE",
          OR: [
            ...(ownerPhone ? [{ ownerPhone }] : []),
            ...(ownerEmail ? [{ ownerEmail }] : []),
          ],
        },
        include: { ambassador: true },
      });

      if (pendingManualClaim) {
        await prisma.ambassadorAttribution.update({
          where: { id: pendingManualClaim.id },
          data: {
            apartmentId: apartment.id,
            apartmentTitle: apartment.title,
            listingCreatedAt: apartment.createdAt,
          },
        });

        if (pendingManualClaim.ambassador) {
          await notifyOnAmbassadorAttribution({
            ambassadorId: pendingManualClaim.ambassador.id,
            ambassadorName: pendingManualClaim.ambassador.name,
            apartmentId: apartment.id,
            apartmentTitle: apartment.title,
            ownerName: apartment.user.username,
            referralCode: pendingManualClaim.ambassador.referralCode || "",
          });
        }
      }
    }

    // Always Notify Admin of New Apartment Listing
    await notifyAdminOnApartmentAdded({
      apartmentId: apartment.id,
      title: apartment.title,
      city: apartment.city,
      ownerName: apartment.user.username,
    });
  } catch (ambassadorErr) {
    console.error("[AmbassadorAttribution] Error linking apartment to ambassador:", ambassadorErr);
  }

  await deleteCacheByPattern("apartment:*");

  return apartment;
};

const getMyAppartment = async (userId: string) => {
  const [apartments, upcomingWeekends] = await Promise.all([
    prisma.apartment.findMany({
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
      orderBy: { createdAt: "desc" },
    }),
    getUpcomingWeekends(),
  ]);

  const now = new Date();

  const formattedApartments = apartments.map((apartment) => {
    const upcomingAvailability = computeUpcomingAvailability(
      apartment.availabilities,
      upcomingWeekends,
    );

    const isListingActive = Boolean(
      apartment.listingPayment &&
      apartment.listingPayment.status === "COMPLETED" &&
      (!apartment.listingPayment.expiresAt || new Date(apartment.listingPayment.expiresAt) > now)
    );

    const isListingExpired = Boolean(
      apartment.listingPayment &&
      apartment.listingPayment.status === "COMPLETED" &&
      apartment.listingPayment.expiresAt &&
      new Date(apartment.listingPayment.expiresAt) <= now
    );

    let daysRemaining: number | null = null;
    if (apartment.listingPayment?.expiresAt) {
      const diffTime = new Date(apartment.listingPayment.expiresAt).getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    const marker = resolveApartmentMarker(apartment);

    return {
      ...apartment,
      marker,
      walkingDistanceToNeighborhood: walkingMinutesToNeighborhood(apartment, NEIGHBORHOOD_CENTROIDS),
      upcomingAvailability,
      availabilityMessage: upcomingAvailability.availabilityMessage,
      isListingActive,
      isListingExpired,
      daysRemaining,
    };
  });

  return formattedApartments;
};

const isAnyOrEmpty = (val: any): boolean => {
  if (val === undefined || val === null || val === "") return true;
  const str = String(val).trim().toLowerCase();
  return str === "any" || str === "all";
};

const resolveApartmentMarker = (apt: any) => {
  if (!apt) return null;
  let resolvedLat = apt.lat ?? apt.neighborhoodLat ?? null;
  let resolvedLng = apt.lng ?? apt.neighborhoodLng ?? null;

  if (resolvedLat == null || resolvedLng == null) {
    const neighNorm = (apt.neighborhood || "").trim().toLowerCase();
    const cityNorm = (apt.city || "").trim().toLowerCase();
    const centroid =
      NEIGHBORHOOD_CENTROIDS[apt.neighborhood] ??
      NEIGHBORHOOD_CENTROIDS[neighNorm] ??
      NEIGHBORHOOD_CENTROIDS[apt.city] ??
      NEIGHBORHOOD_CENTROIDS[cityNorm];

    if (centroid) {
      resolvedLat = resolvedLat ?? centroid.lat;
      resolvedLng = resolvedLng ?? centroid.lng;
    }
  }

  if (resolvedLat == null || resolvedLng == null) {
    return null;
  }

  return {
    id: apt.id,
    propertyId: apt.propertyId ?? null,
    title: apt.title,
    lat: resolvedLat,
    lng: resolvedLng,
    city: apt.city ?? null,
    neighborhood: apt.neighborhood ?? null,
    street1: apt.street1 ?? null,
    propertyType: apt.propertyType ?? null,
    bedrooms: apt.bedrooms ?? null,
    bathrooms: apt.bathrooms ?? null,
    maxGuest: apt.maxGuest ?? null,
    pricePerShabbat: apt.pricePerShabbat ?? null,
    coverImage: apt.coverImage ?? null,
  };
};

const getUpcomingWeekends = async () => {
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );

  return await prisma.weekendCalendar.findMany({
    where: {
      date: {
        gte: todayStart,
      },
    },
    orderBy: {
      date: "asc",
    },
    take: 2,
    select: {
      id: true,
      title: true,
      date: true,
    },
  });
};

const computeUpcomingAvailability = (
  availabilities: any[] = [],
  upcomingWeekends: Array<{ id: string; title: string; date: Date }>,
  filteredWeekendId?: string,
) => {
  if (!upcomingWeekends || upcomingWeekends.length === 0) {
    return {
      upcomingWeekends: [],
      isAvailableNextWeekend: false,
      isAvailableSecondWeekend: false,
      isAvailableNextTwoWeekends: false,
      availabilityMessage: "No upcoming weekend scheduled in calendar",
      canNotify: true,
      canMakeOffer: true,
    };
  }

  const nextWeekend = upcomingWeekends[0];
  const secondWeekend = upcomingWeekends[1] || null;

  const isNextAvail = availabilities.some(
    (a) =>
      a.weekendId === nextWeekend.id ||
      (a.weekend && a.weekend.id === nextWeekend.id),
  );

  const isSecondAvail = secondWeekend
    ? availabilities.some(
        (a) =>
          a.weekendId === secondWeekend.id ||
          (a.weekend && a.weekend.id === secondWeekend.id),
      )
    : false;

  let isFilteredWeekendAvail: boolean | undefined = undefined;
  if (filteredWeekendId) {
    isFilteredWeekendAvail = availabilities.some(
      (a) =>
        a.weekendId === filteredWeekendId ||
        (a.weekend && a.weekend.id === filteredWeekendId),
    );
  }

  let availabilityMessage = "";
  if (upcomingWeekends.length === 1) {
    availabilityMessage = isNextAvail
      ? `Available for next weekend (${nextWeekend.title})`
      : `Unavailable for next weekend (${nextWeekend.title})`;
  } else {
    if (isNextAvail && isSecondAvail) {
      availabilityMessage = "Available for the next two weekends";
    } else if (isNextAvail && !isSecondAvail) {
      availabilityMessage = `Available for next weekend (${nextWeekend.title}), unavailable for next two weekends`;
    } else if (!isNextAvail && isSecondAvail) {
      availabilityMessage = `Unavailable for next weekend (${nextWeekend.title}), available for following weekend (${secondWeekend?.title})`;
    } else {
      availabilityMessage = "Unavailable for next weekend and next two weekends";
    }
  }

  return {
    nextWeekend: {
      ...nextWeekend,
      isAvailable: isNextAvail,
    },
    followingWeekend: secondWeekend
      ? {
          ...secondWeekend,
          isAvailable: isSecondAvail,
        }
      : null,
    isAvailableNextWeekend: isNextAvail,
    isAvailableSecondWeekend: isSecondAvail,
    isAvailableNextTwoWeekends: isNextAvail && isSecondAvail,
    ...(isFilteredWeekendAvail !== undefined && {
      isAvailableForFilteredWeekend: isFilteredWeekendAvail,
    }),
    availabilityMessage,
    canNotify: !isNextAvail || !isSecondAvail,
    canMakeOffer: true,
  };
};

const AMENITY_SYNONYMS: Record<string, string[]> = {
  "wifi": ["Wifi", "WiFi", "wifi", "Internet", "Wireless Internet"],
  "air conditioning": ["Air Conditioning", "Air Condition", "AC", "A/C", "Central AC"],
  "parking": ["Parking", "Free Parking", "Private Parking", "Street Parking"],
  "washing machine": ["Washing Machine", "Washer", "Laundry"],
  "kosher kitchen": ["Kosher Kitchen", "Kosher", "Mehadrin Kitchen", "Strict Mehadrin"],
  "shabbos elevator": ["Shabbos Elevator", "Shabbat Elevator", "Elevator"],
  "shabbat elevator": ["Shabbos Elevator", "Shabbat Elevator", "Elevator"],
  "elevator": ["Shabbos Elevator", "Shabbat Elevator", "Elevator"],
  "shabbos plata": ["Shabbos Plata", "Shabbat Plata", "Plata", "Hot Plate"],
  "shabbat plata": ["Shabbos Plata", "Shabbat Plata", "Plata", "Hot Plate"],
  "plata": ["Shabbos Plata", "Shabbat Plata", "Plata", "Hot Plate"],
  "hot water urn": ["Hot Water Urn", "Shabbat Urn", "Shabbos Urn", "Urn", "Hot Water"],
  "shabbat urn": ["Hot Water Urn", "Shabbat Urn", "Shabbos Urn", "Urn", "Hot Water"],
  "urn": ["Hot Water Urn", "Shabbat Urn", "Shabbos Urn", "Urn", "Hot Water"],
  "shabbos clock": ["Shabbos Clock", "Shabbat Clock", "Timer", "Timers", "Shabbat Timers"],
  "shabbat clock": ["Shabbos Clock", "Shabbat Clock", "Timer", "Timers", "Shabbat Timers"],
  "balcony": ["Balcony", "Terrace", "Sukkah Balcony", "Sukkot Porch"],
  "sukkah balcony": ["Sukkah Balcony", "Sukkot Porch", "Sukkah", "Balcony", "Terrace"],
  "sukkot porch": ["Sukkah Balcony", "Sukkot Porch", "Sukkah", "Balcony", "Terrace"],
  "private garden": ["Private Garden", "Garden", "Courtyard", "Lawn"],
  "garden": ["Private Garden", "Garden", "Courtyard", "Lawn"],
  "baby crib": ["Baby Crib", "Crib Available", "Crib", "Cot"],
  "crib available": ["Baby Crib", "Crib Available", "Crib", "Cot"],
  "wheelchair accessible": ["Wheelchair Accessible", "Wheelchair", "Accessible", "Elevator Access"],
  "wheelchair": ["Wheelchair Accessible", "Wheelchair", "Accessible"],
  "sea view": ["Sea View", "Ocean View", "Beach View", "Lake View", "Water View"],
  "ocean view": ["Sea View", "Ocean View", "Beach View", "Lake View", "Water View"],
  "swimming pool": ["Swimming Pool", "Private Pool", "Pool Access", "Pool"],
  "pool": ["Swimming Pool", "Private Pool", "Pool Access", "Pool"],
  "towels & linen": ["Towels & Linen", "Linen Provided", "Linens", "Towels", "Linen"],
  "linen provided": ["Towels & Linen", "Linen Provided", "Linens", "Towels", "Linen"],
  "coffee machine": ["Coffee Machine", "Coffee Maker", "Nespresso"],
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
    rooms,
    bathrooms,
    maxGuest,
    guestCount,
    guests,
    seats,
    weekendId,
    weekend,
    date,
    amenities,
    maxWalkingMinutes,
    walkingMinutes,
    walkingTime,
    status,
    destLat,
    destLng,
    targetDestination,
    shulAddress,
    destination,
  } = filters;

  // Resolve Target Destination Coordinates
  let parsedDestLat = destLat !== undefined && !isAnyOrEmpty(destLat) ? Number(destLat) : NaN;
  let parsedDestLng = destLng !== undefined && !isAnyOrEmpty(destLng) ? Number(destLng) : NaN;
  const destText = !isAnyOrEmpty(targetDestination)
    ? String(targetDestination).trim()
    : !isAnyOrEmpty(shulAddress)
    ? String(shulAddress).trim()
    : !isAnyOrEmpty(destination)
    ? String(destination).trim()
    : "";

  if ((isNaN(parsedDestLat) || isNaN(parsedDestLng)) && destText !== "") {
    const norm = destText.toLowerCase();
    const match =
      NEIGHBORHOOD_CENTROIDS[destText] ??
      NEIGHBORHOOD_CENTROIDS[norm] ??
      Object.entries(NEIGHBORHOOD_CENTROIDS).find(([k]) => {
        const kLower = k.toLowerCase();
        return kLower === norm || norm.includes(kLower) || kLower.includes(norm);
      })?.[1];
    if (match) {
      parsedDestLat = match.lat;
      parsedDestLng = match.lng;
    }
  }

  const rawWalkingMinutes = !isAnyOrEmpty(walkingMinutes)
    ? walkingMinutes
    : !isAnyOrEmpty(walkingTime)
    ? walkingTime
    : maxWalkingMinutes;

  const parsedWalkingMinutes =
    rawWalkingMinutes !== undefined && !isAnyOrEmpty(rawWalkingMinutes)
      ? Number(String(rawWalkingMinutes).replace(/\D/g, ""))
      : NaN;

  const isDestinationMode = !isNaN(parsedDestLat) && !isNaN(parsedDestLng) && !isNaN(parsedWalkingMinutes);

  const andConditions: Prisma.ApartmentWhereInput[] = [];

  if (!isUserAdmin) {
    andConditions.push({
      status: "CONFIRMED",
      isActive: true,
      OR: [
        { unavailable: false },
        {
          AND: [
            { unavailable: true },
            { receiveRequestWhenUnavailable: true },
          ],
        },
      ],
    });
    andConditions.push({
      OR: [
        { listingPayment: null },
        {
          listingPayment: {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        },
      ],
    });
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

  if (isDestinationMode) {
    // Destination mode: only fetch apartments with coordinates; city/neighborhood filters are optional/supplementary
    andConditions.push({ lat: { not: null } });
    andConditions.push({ lng: { not: null } });
  } else {
    // Standard mode: apply city and neighborhood text filters
    if (!isAnyOrEmpty(city)) {
      logCitySearch(String(city).trim());
      andConditions.push({ city: { contains: String(city).trim(), mode: "insensitive" } });
    }

    if (!isAnyOrEmpty(neighborhood)) {
      andConditions.push({ neighborhood: { contains: String(neighborhood).trim(), mode: "insensitive" } });
    }
  }

  // Property Type Filter (supports string, array, comma-separated, case-insensitive)
  if (!isAnyOrEmpty(propertyType)) {
    const normalizeType = (t: string): PropertyType | null => {
      const upper = String(t).trim().toUpperCase();
      return Object.values(PropertyType).includes(upper as PropertyType)
        ? (upper as PropertyType)
        : null;
    };

    let typesList: PropertyType[] = [];
    if (Array.isArray(propertyType)) {
      typesList = propertyType
        .map((pt) => normalizeType(String(pt)))
        .filter((pt): pt is PropertyType => pt !== null);
    } else {
      const typeStr = String(propertyType).trim();
      typesList = typeStr
        .split(",")
        .map((t) => normalizeType(t))
        .filter((pt): pt is PropertyType => pt !== null);
    }

    if (typesList.length > 0) {
      andConditions.push({ propertyType: { in: typesList } });
    }
  }

  // Price Range Filter
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

  // Rooms / Bedrooms Filter
  const effectiveBedrooms = !isAnyOrEmpty(bedrooms) ? bedrooms : rooms;
  if (!isAnyOrEmpty(effectiveBedrooms) && !isNaN(Number(effectiveBedrooms))) {
    andConditions.push({ bedrooms: { gte: Number(effectiveBedrooms) } });
  }

  // Bathrooms Filter
  if (!isAnyOrEmpty(bathrooms) && !isNaN(Number(bathrooms))) {
    andConditions.push({ bathrooms: { gte: Number(bathrooms) } });
  }

  // Guests / Seats Filter
  const effectiveGuestCount = !isAnyOrEmpty(guestCount)
    ? guestCount
    : !isAnyOrEmpty(maxGuest)
    ? maxGuest
    : !isAnyOrEmpty(guests)
    ? guests
    : seats;
  if (!isAnyOrEmpty(effectiveGuestCount) && !isNaN(Number(effectiveGuestCount))) {
    andConditions.push({ maxGuest: { gte: Number(effectiveGuestCount) } });
  }

  // Weekend / Date Filter
  const rawWeekend = !isAnyOrEmpty(weekendId)
    ? weekendId
    : !isAnyOrEmpty(weekend)
    ? weekend
    : date;

  let filteredWeekendRecordId: string | undefined = undefined;

  if (!isAnyOrEmpty(rawWeekend)) {
    const wStr = String(rawWeekend).trim();
    const isDateValid = !isNaN(new Date(wStr).getTime());

    const matchingWeekend = await prisma.weekendCalendar.findFirst({
      where: {
        OR: [
          { id: wStr },
          { title: { equals: wStr, mode: "insensitive" } },
          ...(isDateValid
            ? [
                {
                  date: {
                    gte: new Date(new Date(wStr).setHours(0, 0, 0, 0)),
                    lte: new Date(new Date(wStr).setHours(23, 59, 59, 999)),
                  },
                },
              ]
            : []),
        ],
      },
    });

    if (matchingWeekend) {
      filteredWeekendRecordId = matchingWeekend.id;
      andConditions.push({
        availabilities: {
          some: {
            weekendId: matchingWeekend.id,
          },
        },
      });
    } else {
      filteredWeekendRecordId = wStr;
      andConditions.push({
        availabilities: {
          some: {
            weekendId: wStr,
          },
        },
      });
    }
  }

  // Amenities Filter (with synonym mapping for UI checkboxes)
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

    for (const item of amenitiesList) {
      const key = item.toLowerCase();
      const variants = AMENITY_SYNONYMS[key] || [
        item,
        item.toLowerCase(),
        item.charAt(0).toUpperCase() + item.slice(1),
      ];

      andConditions.push({
        amenities: {
          hasSome: variants,
        },
      });
    }
  }

  const whereConditions: Prisma.ApartmentWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const [result, upcomingWeekends] = await Promise.all([
    prisma.apartment.findMany({
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
    }),
    getUpcomingWeekends(),
  ]);

  const total = await prisma.apartment.count({
    where: whereConditions,
  });

  let dataWithRating = result.map((apt) => {
    const totalReviews = apt.reviews.length;
    const avgRating =
      totalReviews > 0
        ? apt.reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews
        : 0;

    const upcomingAvailability = computeUpcomingAvailability(
      apt.availabilities,
      upcomingWeekends,
      filteredWeekendRecordId,
    );

    const walkingDistanceToNeighborhood = walkingMinutesToNeighborhood(apt, NEIGHBORHOOD_CENTROIDS);
    const walkingDistanceToDestination = isDestinationMode
      ? walkingMinutesToDestination(apt, parsedDestLat, parsedDestLng)
      : undefined;

    const marker = resolveApartmentMarker(apt);

    return {
      ...apt,
      marker,
      averageRating: Number(avgRating.toFixed(1)),
      totalReviews,
      upcomingAvailability,
      availabilityMessage: upcomingAvailability.availabilityMessage,
      walkingDistanceToNeighborhood,
      ...(isDestinationMode && { walkingDistanceToDestination }),
    };
  });

  // In destination mode: in-memory filter by walking distance (excludes apts without lat/lng)
  if (isDestinationMode) {
    dataWithRating = dataWithRating.filter(
      (apt) =>
        apt.walkingDistanceToDestination !== null &&
        apt.walkingDistanceToDestination !== undefined &&
        apt.walkingDistanceToDestination <= parsedWalkingMinutes,
    );
  }

  const markers = dataWithRating
    .map((apt) => apt.marker)
    .filter((m): m is NonNullable<typeof m> => m !== null);

  const responseData = {
    meta: {
      page,
      limit,
      total: isDestinationMode ? dataWithRating.length : total,
    },
    markers,
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
  const [apartment, upcomingWeekends] = await Promise.all([
    prisma.apartment.findFirst({
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
    }),
    getUpcomingWeekends(),
  ]);

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  const totalReviews = apartment.reviews.length;
  const avgRating =
    totalReviews > 0
      ? apartment.reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews
      : 0;

  const upcomingAvailability = computeUpcomingAvailability(
    apartment.availabilities,
    upcomingWeekends,
  );

  const walkingDistanceToNeighborhood = walkingMinutesToNeighborhood(apartment, NEIGHBORHOOD_CENTROIDS);

  const marker = resolveApartmentMarker(apartment);

  const result = {
    ...apartment,
    marker,
    averageRating: Number(avgRating.toFixed(1)),
    totalReviews,
    upcomingAvailability,
    availabilityMessage: upcomingAvailability.availabilityMessage,
    walkingDistanceToNeighborhood,
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

  const toFloatOrNull = (val: any) =>
    val !== undefined && val !== null && val !== "" && !isNaN(Number(val)) ? Number(val) : null;
  const toIntOrNull = (val: any) =>
    val !== undefined && val !== null && val !== "" && !isNaN(Number(val)) ? Math.round(Number(val)) : null;

  if (payload.lat !== undefined) updateData.lat = toFloatOrNull(payload.lat);
  if (payload.lng !== undefined) updateData.lng = toFloatOrNull(payload.lng);
  if (payload.bedrooms !== undefined) updateData.bedrooms = Number(payload.bedrooms);
  if (payload.bathrooms !== undefined) updateData.bathrooms = Number(payload.bathrooms);
  if (payload.maxGuest !== undefined) updateData.maxGuest = Number(payload.maxGuest);
  if (payload.pricePerShabbat !== undefined) updateData.pricePerShabbat = Number(payload.pricePerShabbat);
  if (payload.neighborhoodLat !== undefined) updateData.neighborhoodLat = toFloatOrNull(payload.neighborhoodLat);
  if (payload.neighborhoodLng !== undefined) updateData.neighborhoodLng = toFloatOrNull(payload.neighborhoodLng);
  if (payload.neighborhoodWalkingMinutes !== undefined) updateData.neighborhoodWalkingMinutes = toIntOrNull(payload.neighborhoodWalkingMinutes);

  if (payload.phone !== undefined) updateData.phone = Boolean(payload.phone);
  if (payload.whatsapp !== undefined) updateData.whatsapp = Boolean(payload.whatsapp);
  if (payload.email !== undefined) updateData.email = Boolean(payload.email);
  if (payload.unavailable !== undefined) updateData.unavailable = Boolean(payload.unavailable);
  if (payload.receiveRequestWhenUnavailable !== undefined) updateData.receiveRequestWhenUnavailable = Boolean(payload.receiveRequestWhenUnavailable);
  if (payload.isActive !== undefined) updateData.isActive = Boolean(payload.isActive);

  if (payload.amenities !== undefined) {
    if (Array.isArray(payload.amenities)) {
      updateData.amenities = payload.amenities;
    } else if (typeof payload.amenities === "string") {
      try {
        const parsed = JSON.parse(payload.amenities);
        if (Array.isArray(parsed)) updateData.amenities = parsed;
      } catch {
        updateData.amenities = (payload.amenities as string).split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }
  }

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
  const apartment = await prisma.apartment.findFirst({
    where: {
      OR: [
        { id: apartmentId },
        { propertyId: apartmentId },
      ],
    },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  if (!isAdmin && apartment.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not own this apartment");
  }

  await prisma.apartment.delete({
    where: { id: apartment.id },
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

  const marker = resolveApartmentMarker(apartment);

  return {
    ...apartment,
    marker,
    averageRating: Number(avgRating.toFixed(1)),
    totalReviews,
  };
};

export const logCitySearch = async (city: string) => {
  try {
    if (!city || !city.trim()) return;
    const clean = city.trim();
    await prisma.citySearchLog.upsert({
      where: { city: clean },
      update: { searchCount: { increment: 1 } },
      create: { city: clean, searchCount: 1 },
    });
  } catch {
    // Ignore logging failures
  }
};

const blockApartment = async (
  apartmentId: string,
  isBlocked: boolean,
  reason?: string,
) => {
  const apartment = await prisma.apartment.findUnique({
    where: { id: apartmentId },
    include: { user: true },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  const updatedStatus = isBlocked
    ? ApartmentStatus.BLOCKED
    : ApartmentStatus.CONFIRMED;

  const result = await prisma.apartment.update({
    where: { id: apartmentId },
    data: { status: updatedStatus },
  });

  await deleteCacheByPattern("apartment:*");

  // Notify owner
  await dispatchNotification({
    title: isBlocked ? "Apartment Blocked" : "Apartment Unblocked",
    message: isBlocked
      ? `Your apartment "${apartment.title}" has been blocked by an administrator.${reason ? ` Reason: ${reason}` : ""}`
      : `Your apartment "${apartment.title}" has been unblocked and is active.`,
    type: isBlocked ? AlertType.WARNING : AlertType.SUCCESS,
    targetUserId: apartment.userId,
    link: "/user-dashboard",
    metadata: { apartmentId, isBlocked, reason },
  });

  return result;
};

const sendAvailabilityReminder = async (payload: {
  weekendId: string;
  apartmentId?: string;
  message?: string;
}) => {
  const weekend = await prisma.weekendCalendar.findUnique({
    where: { id: payload.weekendId },
  });

  if (!weekend) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Weekend calendar record not found");
  }

  const weekendName = weekend.title;
  const weekendDateStr = weekend.date.toISOString().split("T")[0];

  if (payload.apartmentId) {
    const apartment = await prisma.apartment.findUnique({
      where: { id: payload.apartmentId },
      include: { user: true },
    });

    if (!apartment) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
    }

    const defaultMsg = `Please update your availability for "${apartment.title}" for upcoming weekend ${weekendName} (${weekendDateStr}).`;
    const finalMsg = payload.message || defaultMsg;

    // In-app alert
    await dispatchNotification({
      title: "Weekend Availability Update Reminder",
      message: finalMsg,
      type: AlertType.INFO,
      targetUserId: apartment.userId,
      link: `/apartment-availability/${apartment.id}`,
      metadata: { apartmentId: apartment.id, weekendId: payload.weekendId },
    });

    // Email if email exists
    if (apartment.user.email) {
      try {
        await emailHelper.sendEmail({
          to: apartment.user.email,
          subject: `Update Availability for ${weekendName}`,
          html: `<p>Dear ${apartment.user.username},</p><p>${finalMsg}</p><p><a href="https://shabbos-rent-website.vercel.app/user-dashboard">Go to Dashboard</a></p>`,
        });
      } catch (err) {
        console.error("Failed to send reminder email:", err);
      }
    }

    // SMS if phone exists
    const phone = apartment.phoneNumber || apartment.user.phone;
    if (phone) {
      try {
        await smsHelper.sendSms({
          to: phone,
          body: `ShabbosRent: ${finalMsg}`,
        });
      } catch (err) {
        console.error("Failed to send reminder SMS:", err);
      }
    }

    return {
      count: 1,
      message: `Reminder sent to owner of "${apartment.title}"`,
    };
  }

  // Broadcast to all confirmed apartments that do NOT have availability set for this weekend
  const pendingApartments = await prisma.apartment.findMany({
    where: {
      status: ApartmentStatus.CONFIRMED,
      availabilities: {
        none: { weekendId: payload.weekendId },
      },
    },
    include: { user: true },
  });

  let sentCount = 0;

  for (const apt of pendingApartments) {
    try {
      const defaultMsg = `Please update your availability for "${apt.title}" for upcoming weekend ${weekendName} (${weekendDateStr}).`;
      const finalMsg = payload.message || defaultMsg;

      // In-app alert
      await dispatchNotification({
        title: "Weekend Availability Reminder",
        message: finalMsg,
        type: AlertType.INFO,
        targetUserId: apt.userId,
        link: `/apartment-availability/${apt.id}`,
        metadata: { apartmentId: apt.id, weekendId: payload.weekendId },
      });

      // Email
      if (apt.user.email) {
        emailHelper
          .sendEmail({
            to: apt.user.email,
            subject: `Update Availability for ${weekendName}`,
            html: `<p>Dear ${apt.user.username},</p><p>${finalMsg}</p><p><a href="https://shabbos-rent-website.vercel.app/user-dashboard">Go to Dashboard</a></p>`,
          })
          .catch(() => {});
      }

      // SMS
      const phone = apt.phoneNumber || apt.user.phone;
      if (phone) {
        smsHelper
          .sendSms({
            to: phone,
            body: `ShabbosRent: ${finalMsg}`,
          })
          .catch(() => {});
      }

      sentCount++;
    } catch (loopErr) {
      console.error(`Error sending reminder to apartment ${apt.id}:`, loopErr);
    }
  }

  return {
    count: sentCount,
    message: `Availability reminders dispatched to ${sentCount} apartment owners for weekend ${weekendName}`,
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
  blockApartment,
  sendAvailabilityReminder,
  logCitySearch,
  deleteApartment,
};
