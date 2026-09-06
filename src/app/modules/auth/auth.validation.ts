import { z } from "zod";

const registerZodSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Invalid email address").optional(),
    phone: z.string().min(6, "Phone number must be at least 6 digits").optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    referralCode: z.string().optional(),
    marketingPlatformId: z.string().optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "At least one of email or phone number is required",
    path: ["email"],
  });

const loginZodSchema = z
  .object({
    identifier: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    password: z.string().min(1, "Password is required"),
  })
  .refine((data) => data.identifier || data.email || data.phone, {
    message: "Email, phone number, or identifier is required",
    path: ["identifier"],
  });

const demoLoginZodSchema = z.object({
  role: z.enum(["admin", "user", "user1", "user2", "ambassador"]),
});

const changePasswordZodSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

const forgotPasswordZodSchema = z.object({
  identifier: z.string().min(1, "Email or phone number is required"),
});

const verifyOtpZodSchema = z.object({
  identifier: z.string().min(1, "Email or phone number is required"),
  otp: z.number().int("OTP must be a number"),
});

const resetPasswordZodSchema = z.object({
  identifier: z.string().min(1, "Email or phone number is required"),
  otp: z.number().int("OTP must be a number"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

const refreshTokenZodSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

const resendOtpZodSchema = z.object({
  identifier: z.string().min(1, "Email or phone number is required"),
});

export const AuthValidation = {
  registerZodSchema,
  loginZodSchema,
  demoLoginZodSchema,
  changePasswordZodSchema,
  forgotPasswordZodSchema,
  verifyOtpZodSchema,
  resendOtpZodSchema,
  resetPasswordZodSchema,
  refreshTokenZodSchema,
};
