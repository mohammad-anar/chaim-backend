import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import catchAsync from "../../shared/catchAsync.js";
import { getSingleFilePath } from "../../shared/getFilePath.js";
import pick from "../../../helpers/pick.js";
import sendResponse from "../../shared/sendResponse.js";
import { WeekendCalendarServices } from "./weekendCalendar.service.js";

const createWeekendCalendar = catchAsync(async (req: Request, res: Response) => {
  const result = await WeekendCalendarServices.createWeekendCalendar(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Weekend calendar created successfully",
    data: result,
  });
});

const uploadExcel = catchAsync(async (req: Request, res: Response) => {
  const filePath =
    getSingleFilePath(req.files, "doc") ||
    getSingleFilePath(req.files, "file") ||
    getSingleFilePath(req.files, "csv");

  if (!filePath) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Excel or CSV file is required");
  }

  const isSync = req.query.sync === "true" || req.query.direct === "true";
  const result = await WeekendCalendarServices.uploadExcel(filePath, isSync);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message || "Weekend calendar Excel processed successfully",
    data: result,
  });
});

const uploadCsv = catchAsync(async (req: Request, res: Response) => {
  const filePath =
    getSingleFilePath(req.files, "doc") ||
    getSingleFilePath(req.files, "file") ||
    getSingleFilePath(req.files, "csv");

  if (!filePath) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "CSV file is required");
  }

  const result = await WeekendCalendarServices.uploadCsv(filePath);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Weekend calendar CSV processed successfully",
    data: result,
  });
});

const getAllWeekendCalendars = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["searchTerm", "startDate", "endDate"]);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const result = await WeekendCalendarServices.getAllWeekendCalendars(filters as any, options as any);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Weekend calendars retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getWeekendCalendarById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await WeekendCalendarServices.getWeekendCalendarById(id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Weekend calendar retrieved successfully",
    data: result,
  });
});

const updateWeekendCalendar = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await WeekendCalendarServices.updateWeekendCalendar(id, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Weekend calendar updated successfully",
    data: result,
  });
});

const deleteWeekendCalendar = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await WeekendCalendarServices.deleteWeekendCalendar(id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Weekend calendar deleted successfully",
    data: result,
  });
});

export const WeekendCalendarController = {
  createWeekendCalendar,
  uploadExcel,
  uploadCsv,
  getAllWeekendCalendars,
  getWeekendCalendarById,
  updateWeekendCalendar,
  deleteWeekendCalendar,
};

