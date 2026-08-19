import fs from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import XLSX from "xlsx";
import ApiError from "../../../errors/ApiError.js";
import { excelImportQueue } from "../../../helpers/bullQueue.js";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { parseFlexibleDate } from "../../../helpers/parseDate.js";
import { prisma } from "../../../helpers/prisma.js";
import { IPaginationOptions } from "../../../types/pagination.js";
import {
  ICreateWeekendCalendar,
  IUpdateWeekendCalendar,
  IWeekendCalendarFilter,
} from "./weekendCalendar.interface.js";

const createWeekendCalendar = async (payload: ICreateWeekendCalendar) => {
  const dateObj = parseFlexibleDate(payload.date);
  if (!dateObj) {
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

const processExcelFile = async (filePath: string) => {
  const relativePath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const absolutePath = path.join(process.cwd(), "uploads", relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Uploaded Excel file not found");
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.readFile(absolutePath, { cellDates: true, raw: false });
  } catch (err: any) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Failed to parse Excel file: ${err.message || err}`,
    );
  }

  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Excel file contains no sheets");
  }

  const sheet = workbook.Sheets[sheetNames[0]];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });

  console.log(`[ExcelImport] Found ${rows.length} rows in sheet: "${sheetNames[0]}"`);

  if (rows.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Excel sheet is empty");
  }

  let insertedCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    let titleVal: string | undefined;
    let dateVal: any;

    for (const key of Object.keys(row)) {
      const lowerKey = key.trim().toLowerCase();
      if (lowerKey === "title") {
        titleVal = String(row[key]).trim();
      } else if (lowerKey === "date") {
        dateVal = row[key];
      }
    }

    if (!titleVal || !dateVal) {
      console.log(`[ExcelImport] Skipping row due to missing title or date:`, row);
      continue;
    }

    const dateObj = parseFlexibleDate(dateVal);
    if (!dateObj) {
      console.log(`[ExcelImport] Skipping row due to unparseable date: dateVal=${dateVal}`);
      continue;
    }

    // CHECK IF DATE ALREADY EXISTS IN WEEKEND CALENDAR
    const existingDate = await prisma.weekendCalendar.findUnique({
      where: { date: dateObj },
    });

    if (existingDate) {
      console.log(
        `[ExcelImport] Skipping date ${dateObj.toISOString()} - already exists as "${existingDate.title}"`,
      );
      skippedCount++;
      continue;
    }

    let finalTitle = titleVal;
    const existingTitle = await prisma.weekendCalendar.findUnique({
      where: { title: titleVal },
    });
    if (existingTitle) {
      const formattedDateStr = dateObj.toISOString().split("T")[0];
      finalTitle = `${titleVal} (${formattedDateStr})`;
    }

    const created = await prisma.weekendCalendar.create({
      data: {
        title: finalTitle,
        date: dateObj,
      },
    });

    console.log(`[ExcelImport] Created new weekend: ID=${created.id}, Title="${created.title}", Date=${created.date.toISOString()}`);
    insertedCount++;
  }

  try {
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch (err) {
    console.error("Failed to delete temp Excel file:", err);
  }

  console.log(`[ExcelImport] Complete. Total: ${rows.length}, Inserted: ${insertedCount}, Skipped: ${skippedCount}`);

  return {
    totalRows: rows.length,
    insertedCount,
    skippedCount,
  };
};

const uploadExcel = async (filePath: string, isSync: boolean = false) => {
  if (isSync) {
    const result = await processExcelFile(filePath);
    return {
      queued: false,
      message: `Excel file processed directly. Total: ${result.totalRows}, Inserted: ${result.insertedCount}, Skipped: ${result.skippedCount}`,
      ...result,
    };
  }

  try {
    const job = await excelImportQueue.add("processWeekendCalendarExcel", { filePath });
    return {
      queued: true,
      jobId: job.id,
      message: "Excel file import queued successfully for background processing",
    };
  } catch (queueErr) {
    console.warn("BullMQ queue add failed, falling back to direct processing:", queueErr);
    const result = await processExcelFile(filePath);
    return {
      queued: false,
      message: `Excel file processed directly. Total: ${result.totalRows}, Inserted: ${result.insertedCount}, Skipped: ${result.skippedCount}`,
      ...result,
    };
  }
};

const uploadCsv = async (filePath: string) => {
  return await processExcelFile(filePath);
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
    const parsedStart = parseFlexibleDate(startDate);
    if (parsedStart) {
      andConditions.push({
        date: { gte: parsedStart },
      });
    }
  }

  if (endDate) {
    const parsedEnd = parseFlexibleDate(endDate);
    if (parsedEnd) {
      andConditions.push({
        date: { lte: parsedEnd },
      });
    }
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
  if (payload.date) {
    const parsed = parseFlexibleDate(payload.date);
    if (!parsed) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid date format");
    }
    updateData.date = parsed;
  }

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
  processExcelFile,
  uploadExcel,
  uploadCsv,
  getAllWeekendCalendars,
  getWeekendCalendarById,
  updateWeekendCalendar,
  deleteWeekendCalendar,
};

