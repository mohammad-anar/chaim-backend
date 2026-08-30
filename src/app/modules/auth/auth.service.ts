import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { Secret } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import config from "../../../config/index.js";
import ApiError from "../../../errors/ApiError.js";
import generateOTP from "../../../helpers/generateOTP.js";
import { jwtHelper } from "../../../helpers/jwtHelper.js";
import { prisma } from "../../../helpers/prisma.js";
import { emailHelper } from "../../../helpers/emailHelper.js";
import { emailTemplate } from "../../shared/emailTemplate.js";
import { notifyOnUserRegisteredViaAmbassador } from "../../../helpers/notificationHelper.js";
import {
  IChangePassword,
  IForgotPassword,
  ILoginUser,
  IRefreshToken,
  IRegisterUser,
  IResetPassword,
  IVerifyOtp,
} from "./auth.interface.js";

const registerUser = async (payload: IRegisterUser) => {
  const existingUsername = await prisma.user.findUnique({
    where: { username: payload.username },
  });
  if (existingUsername) {
    throw new ApiError(StatusCodes.CONFLICT, "Username already exists");
  }

  if (payload.email) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: payload.email },
    });
    if (existingEmail) {
      throw new ApiError(StatusCodes.CONFLICT, "Email already exists");
    }
  }

  if (payload.phone) {
    const existingPhone = await prisma.user.findUnique({
      where: { phone: payload.phone },
    });
    if (existingPhone) {
      throw new ApiError(StatusCodes.CONFLICT, "Phone number already exists");
    }
  }

  const saltRound = config.bcrypt_salt_round || 10;
  const hashedPassword = await bcrypt.hash(payload.password, saltRound);

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

  const result = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        username: payload.username,
        email: payload.email,
        phone: payload.phone,
        password: hashedPassword,
        profileImage: payload.profileImage,
        marketingPlatformId: payload.marketingPlatformId,
        role: UserRole.USER,
        otp,
        otpExpiry,
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        profileImage: true,
        role: true,
        status: true,
        marketingPlatformId: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.wallet.create({
      data: {
        userId: newUser.id,
        balance: 0.0,
        currency: "ILS",
      },
    });

    return newUser;
  });

  if (payload.email) {
    try {
      const template = emailTemplate.createAccount({
        name: result.username,
        email: payload.email,
        otp,
      });
      await emailHelper.sendEmail(template);
    } catch (err: any) {
      console.error("Failed to send registration OTP email:", err?.message || err);
    }
  }

  // Handle ambassador referral code attribution on registration
  if (payload.referralCode && payload.referralCode.trim() !== "") {
    try {
      const ambassador = await prisma.ambassador.findUnique({
        where: { referralCode: payload.referralCode.trim().toUpperCase() },
      });

      if (ambassador && ambassador.status === "ACTIVE") {
        // Track user-level referral attribution
        // Note: apartmentTitle and ownerPhone are required (non-nullable) in schema.
        // We store a placeholder; the real apartment linkage happens when the user lists a property.
        await prisma.ambassadorAttribution.create({
          data: {
            ambassadorId: ambassador.id,
            apartmentId: null,
            apartmentTitle: "(Pending — user registered via referral link)",
            ownerName: result.username,
            ownerPhone: (result.phone || "").replace(/\D/g, "") || "unknown",
            ownerEmail: result.email || null,
            model: null,
            modelDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            method: "LINK",
            status: "ACTIVE",
            listingCreatedAt: new Date(),
          },
        });

        // Notify admin + ambassador
        await notifyOnUserRegisteredViaAmbassador({
          ambassadorId: ambassador.id,
          ambassadorName: ambassador.name,
          referralCode: ambassador.referralCode || payload.referralCode,
          newUserId: result.id,
          newUserName: result.username,
          newUserEmail: result.email || undefined,
          newUserPhone: result.phone || undefined,
        });
      }
    } catch (refErr) {
      console.error("[AmbassadorReferral] Error attributing user registration:", refErr);
    }
  }

  return result;
};

const loginUser = async (payload: ILoginUser) => {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User does not exist");
  }

  if (user.isDeleted) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Your account has been deleted");
  }

  if (user.status === "BLOCKED" || user.status === "SUSPENDED") {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      `Your account is ${user.status.toLowerCase()}`,
    );
  }

  const isPasswordMatched = await bcrypt.compare(password, user.password);
  if (!isPasswordMatched) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid password");
  }

  const jwtPayload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtHelper.createToken(
    jwtPayload,
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as any,
  );

  const refreshToken = jwtHelper.createToken(
    jwtPayload,
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_refresh_expire_in as any,
  );

  const { password: userPassword, ...userData } = user;

  return {
    accessToken,
    refreshToken,
    user: userData,
  };
};

const refreshToken = async (payload: IRefreshToken) => {
  const { refreshToken: token } = payload;

  let verifyToken;
  try {
    verifyToken = jwtHelper.verifyToken(
      token,
      config.jwt.jwt_secret as Secret,
    );
  } catch (error) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid Refresh Token");
  }

  const user = await prisma.user.findUnique({
    where: { id: verifyToken.id },
  });

  if (!user || user.isDeleted || user.status !== "ACTIVE") {
    throw new ApiError(StatusCodes.FORBIDDEN, "User is not authorized");
  }

  const newJwtPayload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  const newAccessToken = jwtHelper.createToken(
    newJwtPayload,
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as any,
  );

  return {
    accessToken: newAccessToken,
  };
};

const changePassword = async (userId: string, payload: IChangePassword) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  const isPasswordMatched = await bcrypt.compare(
    payload.oldPassword,
    user.password,
  );
  if (!isPasswordMatched) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Incorrect old password");
  }

  const saltRound = config.bcrypt_salt_round || 10;
  const newHashedPassword = await bcrypt.hash(payload.newPassword, saltRound);

  await prisma.user.update({
    where: { id: userId },
    data: { password: newHashedPassword },
  });

  return { message: "Password changed successfully" };
};

const forgotPassword = async (payload: IForgotPassword) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found with this email");
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

  await prisma.user.update({
    where: { id: user.id },
    data: {
      otp,
      otpExpiry,
    },
  });

  if (user.email) {
    try {
      const template = emailTemplate.resetPassword({
        email: user.email,
        otp,
      });
      await emailHelper.sendEmail(template);
    } catch (err: any) {
      console.error("Failed to send reset password OTP email:", err?.message || err);
    }
  }

  return {
    message: "OTP sent to user email and stored in database successfully",
  };
};

const verifyOtp = async (payload: IVerifyOtp) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (!user.otp || user.otp !== payload.otp) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid OTP");
  }

  if (!user.otpExpiry || user.otpExpiry < new Date()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "OTP has expired");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      otp: null,
      otpExpiry: null,
    },
  });

  return { message: "OTP verified successfully" };
};

const resetPassword = async (payload: IResetPassword) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (!user.otp || user.otp !== payload.otp) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid OTP");
  }

  if (!user.otpExpiry || user.otpExpiry < new Date()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "OTP has expired");
  }

  const saltRound = config.bcrypt_salt_round || 10;
  const hashedPassword = await bcrypt.hash(payload.newPassword, saltRound);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      otp: null,
      otpExpiry: null,
    },
  });

  return { message: "Password reset successfully" };
};

const resendOtp = async (payload: { email: string }) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found with this email");
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.user.update({
    where: { id: user.id },
    data: {
      otp,
      otpExpiry,
    },
  });

  if (user.email) {
    try {
      const template = emailTemplate.createAccount({
        name: user.username,
        email: user.email,
        otp,
      });
      await emailHelper.sendEmail(template);
    } catch (err: any) {
      console.error("Failed to resend OTP email:", err?.message || err);
    }
  }

  return {
    message: "OTP resent successfully",
  };
};

export const AuthServices = {
  registerUser,
  loginUser,
  refreshToken,
  changePassword,
  forgotPassword,
  verifyOtp,
  resendOtp,
  resetPassword,
};
