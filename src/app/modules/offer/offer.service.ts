import { OfferStatus } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { prisma } from "../../../helpers/prisma.js";
import { ICreateOffer } from "./offer.interface.js";

const createOffer = async (userId: string, payload: ICreateOffer) => {
  const apartment = await prisma.apartment.findUnique({
    where: { id: payload.apartmentId },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  if (apartment.userId === userId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "You cannot send an offer for your own apartment");
  }

  const result = await prisma.offer.create({
    data: {
      ownerId: userId,
      apartmentId: payload.apartmentId,
      shabbosId: payload.shabbosId,
      originalPrice: apartment.pricePerShabbat,
      offerPrice: payload.offerPrice,
      message: payload.message,
      status: OfferStatus.PENDING,
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
      shabbos: true,
    },
  });

  return result;
};

const getMyOffers = async (userId: string) => {
  const userApartment = await prisma.apartment.findUnique({
    where: { userId },
  });

  const sent = await prisma.offer.findMany({
    where: { ownerId: userId },
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
        },
      },
      shabbos: true,
    },
    orderBy: { createdAt: "desc" },
  });

  let received: any[] = [];
  if (userApartment) {
    received = await prisma.offer.findMany({
      where: { apartmentId: userApartment.id },
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
        shabbos: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  return { sent, received };
};

const updateOfferStatus = async (
  userId: string,
  offerId: string,
  status: OfferStatus,
) => {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: {
      apartment: true,
    },
  });

  if (!offer) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Offer not found");
  }

  if (offer.apartment.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only the owner of the apartment can accept or reject offers");
  }

  const result = await prisma.offer.update({
    where: { id: offerId },
    data: { status },
  });

  return result;
};

export const OfferServices = {
  createOffer,
  getMyOffers,
  updateOfferStatus,
};
