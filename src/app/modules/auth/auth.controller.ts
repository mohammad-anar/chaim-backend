import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync.js";
import { getSingleFilePath } from "../../shared/getFilePath.js";
import sendResponse from "../../shared/sendResponse.js";
import { AuthServices } from "./auth.service.js";

const registerUser = catchAsync(async (req: Request, res: Response) => {
  const profileImage = getSingleFilePath(req.files, "image");
  
  const payload = {
    ...req.body,
    ...(profileImage && { profileImage }),
  };

  const result = await AuthServices.registerUser(payload);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "User registered successfully",
    data: result,
  });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.loginUser(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User logged in successfully",
    data: result,
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const token = req.body.refreshToken || req.headers.authorization;
  const result = await AuthServices.refreshToken({ refreshToken: token });
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Access token retrieved successfully",
    data: result,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await AuthServices.changePassword(userId, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Password changed successfully",
    data: result,
  });
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.forgotPassword(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Password reset OTP generated and stored successfully",
    data: result,
  });
});

const verifyOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.verifyOtp(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "OTP verified successfully",
    data: result,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.resetPassword(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Password reset successfully",
    data: result,
  });
});

export const AuthController = {
  registerUser,
  loginUser,
  refreshToken,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
};
