import fs from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { prisma } from "../../../helpers/prisma.js";
import { IPaginationOptions } from "../../../types/pagination.js";
import {
  ICreateWeekendCalendar,
  IUpdateWeekendCalendar,
  IWeekendCalendarFilter,
} from "./weekendCalendar.interface.js";

const createWeekendCalendar = async (payload: ICreateWeekendCalendar) => {
  const dateObj = new Date(payload.date);
  if (isNaN(dateObj.getTime())) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid date format");
  }

  const existingTitle = await prisma.weekendCalendar.findUnique({
    where: { title: payload.title },
  });
  if (existingTitle) {
    throw new ApiError(StatusCodes.CONFLICT, "Weekend calendar title already exists");
  }

  const existingDate = await prisma.weekendCalendar.findUnique({
    where: { date: dateObj },
  });
  if (existingDate) {
    throw new ApiError(StatusCodes.CONFLICT, "Weekend calendar for this date already exists");
  }

  const result = await prisma.weekendCalendar.create({
    data: {
      title: payload.title,
      date: dateObj,
    },
  });

  return result;
};

const uploadCsv = async (filePath: string) => {
  const relativePath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const absolutePath = path.join(process.cwd(), "uploads", relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Uploaded CSV file not found");
  }

  const fileContent = fs.readFileSync(absolutePath, "utf-8");
  const lines = fileContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (lines.length <= 1) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "CSV file is empty or missing data");
  }

  const header = lines[0].toLowerCase().split(",");
  const titleIndex = header.indexOf("title");
  const dateIndex = header.indexOf("date");

  if (titleIndex === -1 || dateIndex === -1) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "CSV header must contain 'title' and 'date' columns",
    );
  }

  let processedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const title = columns[titleIndex];
    const dateStr = columns[dateIndex];

    if (!title || !dateStr) continue;

    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) continue;

    await prisma.weekendCalendar.upsert({
      where: { date: dateObj },
      update: { title },
      create: { title, date: dateObj },
    });

    processedCount++;
  }

  try {
    fs.unlinkSync(absolutePath);
  } catch (err) {
    console.error("Failed to delete temp CSV file:", err);
  }

  return {
    message: "CSV processed successfully",
    processedCount,
  };
};

const getAllWeekendCalendars = async (
  filters: IWeekendCalendarFilter,
  options: IPaginationOptions,
) => {
  const { limit, page, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);
  const { searchTerm, startDate, endDate } = filters;

  const andConditions: Prisma.WeekendCalendarWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      title: { contains: searchTerm, mode: "insensitive" },
    });
  }

  if (startDate) {
    andConditions.push({
      date: { gte: new Date(startDate) },
    });
  }

  if (endDate) {
    andConditions.push({
      date: { lte: new Date(endDate) },
    });
  }

  const whereConditions: Prisma.WeekendCalendarWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.weekendCalendar.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
  });

  const total = await prisma.weekendCalendar.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getWeekendCalendarById = async (id: string) => {
  const result = await prisma.weekendCalendar.findUnique({
    where: { id },
    include: {
      availabilities: {
        include: {
          apartment: {
            select: {
              id: true,
              title: true,
              city: true,
              pricePerShabbat: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Weekend calendar not found");
  }

  return result;
};

const updateWeekendCalendar = async (
  id: string,
  payload: IUpdateWeekendCalendar,
) => {
  const calendar = await prisma.weekendCalendar.findUnique({
    where: { id },
  });

  if (!calendar) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Weekend calendar not found");
  }

  const updateData: any = {};
  if (payload.title) updateData.title = payload.title;
  if (payload.date) updateData.date = new Date(payload.date);

  const result = await prisma.weekendCalendar.update({
    where: { id },
    data: updateData,
  });

  return result;
};

const deleteWeekendCalendar = async (id: string) => {
  const calendar = await prisma.weekendCalendar.findUnique({
    where: { id },
  });

  if (!calendar) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Weekend calendar not found");
  }

  await prisma.weekendCalendar.delete({
    where: { id },
  });

  return { message: "Weekend calendar deleted successfully" };
};

export const WeekendCalendarServices = {
  createWeekendCalendar,
  uploadCsv,
  getAllWeekendCalendars,
  getWeekendCalendarById,
  updateWeekendCalendar,
  deleteWeekendCalendar,
};
