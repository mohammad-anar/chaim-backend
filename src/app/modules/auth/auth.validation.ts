import { z } from "zod";

const registerZodSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  referralCode: z.string().optional(),
});

const loginZodSchema = z.object({
  email: z.email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

const changePasswordZodSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

const forgotPasswordZodSchema = z.object({
  email: z.string().email("Valid email is required"),
});

const verifyOtpZodSchema = z.object({
  email: z.string().email("Valid email is required"),
  otp: z.number().int("OTP must be a number"),
});

const resetPasswordZodSchema = z.object({
  email: z.string().email("Valid email is required"),
  otp: z.number().int("OTP must be a number"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

const refreshTokenZodSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

const resendOtpZodSchema = z.object({
  email: z.string().email("Valid email is required"),
});

export const AuthValidation = {
  registerZodSchema,
  loginZodSchema,
  changePasswordZodSchema,
  forgotPasswordZodSchema,
  verifyOtpZodSchema,
  resendOtpZodSchema,
  resetPasswordZodSchema,
  refreshTokenZodSchema,
};
