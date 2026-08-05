import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { prisma } from "../../../helpers/prisma.js";

const toggleWishlist = async (userId: string, apartmentId: string) => {
  const apartment = await prisma.apartment.findUnique({
    where: { id: apartmentId },
  });

  if (!apartment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Apartment not found");
  }

  const existing = await prisma.wishlist.findUnique({
    where: {
      userId_apartmentId: {
        userId,
        apartmentId,
      },
    },
  });

  if (existing) {
    await prisma.wishlist.delete({
      where: { id: existing.id },
    });
    return { isWishlisted: false, message: "Apartment removed from wishlist" };
  }

  const result = await prisma.wishlist.create({
    data: {
      userId,
      apartmentId,
    },
    include: {
      apartment: true,
    },
  });

  return { isWishlisted: true, message: "Apartment added to wishlist", data: result };
};

const getMyWishlist = async (userId: string) => {
  const wishlists = await prisma.wishlist.findMany({
    where: { userId },
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
          reviews: {
            select: {
              rating: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formattedData = wishlists.map((w) => {
    const totalReviews = w.apartment.reviews.length;
    const avgRating =
      totalReviews > 0
        ? w.apartment.reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews
        : 0;

    return {
      id: w.id,
      createdAt: w.createdAt,
      apartment: {
        ...w.apartment,
        averageRating: Number(avgRating.toFixed(1)),
        totalReviews,
      },
    };
  });

  return formattedData;
};

export const WishlistServices = {
  toggleWishlist,
  getMyWishlist,
};
