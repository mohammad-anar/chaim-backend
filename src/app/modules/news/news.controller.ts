import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { NewsService } from "./news.service.js";

const createNews = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsService.createNews(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "News article created successfully",
    data: result,
  });
});

const getAllNews = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsService.getAllNews(req.query as any);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "News articles retrieved successfully",
    data: result,
  });
});

const getNewsById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await NewsService.getNewsById(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "News article retrieved successfully",
    data: result,
  });
});

const updateNews = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await NewsService.updateNews(id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "News article updated successfully",
    data: result,
  });
});

const deleteNews = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await NewsService.deleteNews(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "News article deleted successfully",
    data: result,
  });
});

export const NewsController = {
  createNews,
  getAllNews,
  getNewsById,
  updateNews,
  deleteNews,
};
