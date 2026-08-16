import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { prisma } from "../../../helpers/prisma.js";
import { ICreateReview } from "./review.interface.js";

const createReview = async (userId: string, payload: ICreateReview) => {
  const apartment = await prisma.apartment.findUnique({
    where: { id: payload.apartmentId },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  const result = await prisma.review.create({
    data: {
      userId,
      apartmentId: payload.apartmentId,
      title: payload.title,
      message: payload.message,
      rating: payload.rating,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          profileImage: true,
        },
      },
    },
  });

  return result;
};

const getApartmentReviews = async (apartmentId: string) => {
  const apartment = await prisma.apartment.findUnique({
    where: { id: apartmentId },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  const reviews = await prisma.review.findMany({
    where: { apartmentId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          profileImage: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews
      : 0;

  return {
    averageRating: Number(avgRating.toFixed(1)),
    totalReviews,
    reviews,
  };
};

const deleteReview = async (userId: string, reviewId: string, isAdmin: boolean = false) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Review not found");
  }

  if (!isAdmin && review.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You cannot delete this review");
  }

  await prisma.review.delete({
    where: { id: reviewId },
  });

  return { message: "Review deleted successfully" };
};

export const ReviewServices = {
  createReview,
  getApartmentReviews,
  deleteReview,
};
