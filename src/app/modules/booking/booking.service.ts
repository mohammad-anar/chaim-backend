import { BookingStatus } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { prisma } from "../../../helpers/prisma.js";
import { ICreateBooking } from "./booking.interface.js";

const createBooking = async (userId: string, payload: ICreateBooking) => {
  const result = await prisma.$transaction(async (tx) => {
    const apartment = await tx.apartment.findUnique({
      where: { id: payload.apartmentId },
    });

    if (!apartment) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
    }

    if (apartment.status !== "CONFIRMED") {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Apartment is not available for booking");
    }

    if (apartment.userId === userId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "You cannot book your own apartment");
    }

    const availability = await tx.apartmentAvailability.findUnique({
      where: {
        apartmentId_weekendId: {
          apartmentId: payload.apartmentId,
          weekendId: payload.weekendId,
        },
      },
    });

    if (!availability) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Apartment is not listed as available for the selected weekend",
      );
    }

    const existingBooking = await tx.booking.findFirst({
      where: {
        apartmentId: payload.apartmentId,
        weekendId: payload.weekendId,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
        },
      },
    });

    if (existingBooking) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        "Apartment is already booked for this weekend",
      );
    }

    const booking = await tx.booking.create({
      data: {
        userId,
        apartmentId: payload.apartmentId,
        weekendId: payload.weekendId,
        totalAmount: payload.totalAmount,
        status: BookingStatus.PENDING,
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
        weekend: true,
      },
    });

    return booking;
  });

  return result;
};

const getMyBookings = async (userId: string) => {
  const bookings = await prisma.booking.findMany({
    where: { userId },
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
      weekend: true,
      bookingPayment: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return bookings;
};

const getApartmentBookings = async (userId: string, apartmentId: string) => {
  const apartment = await prisma.apartment.findUnique({
    where: { id: apartmentId },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  if (apartment.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not own this apartment");
  }

  const bookings = await prisma.booking.findMany({
    where: { apartmentId },
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
      weekend: true,
      bookingPayment: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return bookings;
};

const cancelBooking = async (userId: string, bookingId: string) => {
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { apartment: true },
    });

    if (!booking) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Booking not found");
    }

    if (booking.userId !== userId && booking.apartment.userId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "You are not authorized to cancel this booking");
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.COMPLETED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, `Booking is already ${booking.status.toLowerCase()}`);
    }

    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
    });

    return updatedBooking;
  });

  return result;
};

export const BookingServices = {
  createBooking,
  getMyBookings,
  getApartmentBookings,
  cancelBooking,
};
