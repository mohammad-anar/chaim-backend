import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { prisma } from "../../../helpers/prisma.js";
import { ICreateNewsPayload, IUpdateNewsPayload } from "./news.interface.js";

const createNews = async (payload: ICreateNewsPayload) => {
  return await prisma.news.create({
    data: {
      title: payload.title,
      content: payload.content,
      summary: payload.summary || null,
      image: payload.image || null,
      author: payload.author || "Admin",
      isPublished: payload.isPublished !== undefined ? payload.isPublished : true,
    },
  });
};

const getAllNews = async (query: { isPublished?: string; searchTerm?: string }) => {
  const where: any = {};

  if (query.isPublished !== undefined) {
    where.isPublished = query.isPublished === "true";
  }

  if (query.searchTerm) {
    where.OR = [
      { title: { contains: query.searchTerm, mode: "insensitive" } },
      { content: { contains: query.searchTerm, mode: "insensitive" } },
      { summary: { contains: query.searchTerm, mode: "insensitive" } },
    ];
  }

  return await prisma.news.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
};

const getNewsById = async (id: string) => {
  const news = await prisma.news.findUnique({
    where: { id },
  });

  if (!news) {
    throw new ApiError(StatusCodes.NOT_FOUND, "News article not found");
  }

  // Increment views
  await prisma.news.update({
    where: { id },
    data: { views: { increment: 1 } },
  });

  return news;
};

const updateNews = async (id: string, payload: IUpdateNewsPayload) => {
  const existing = await prisma.news.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "News article not found");
  }

  return await prisma.news.update({
    where: { id },
    data: payload,
  });
};

const deleteNews = async (id: string) => {
  const existing = await prisma.news.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "News article not found");
  }

  return await prisma.news.delete({
    where: { id },
  });
};

export const NewsService = {
  createNews,
  getAllNews,
  getNewsById,
  updateNews,
  deleteNews,
};
