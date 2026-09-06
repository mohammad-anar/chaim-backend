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
import { smsHelper } from "../../../helpers/smsHelper.js";
import { emailTemplate } from "../../shared/emailTemplate.js";
import { notifyOnUserRegisteredViaAmbassador } from "../../../helpers/notificationHelper.js";
import {
  IChangePassword,
  IDemoLogin,
  IForgotPassword,
  ILoginUser,
  IRefreshToken,
  IRegisterUser,
  IResetPassword,
  IVerifyOtp,
} from "./auth.interface.js";

// ---------------------------------------------------------------------------
// Helper: resolve a user record by email-or-phone identifier
// ---------------------------------------------------------------------------
const findUserByIdentifier = async (identifier: string) => {
  const normalized = identifier.trim().toLowerCase();
  const phoneOnly = identifier.replace(/\D/g, "");

  return prisma.user.findFirst({
    where: {
      OR: [
        { email: normalized },
        ...(phoneOnly.length >= 6 ? [{ phone: phoneOnly }] : []),
      ],
    },
  });
};

// ---------------------------------------------------------------------------
// Helper: deliver OTP to the user's available contact channel
// ---------------------------------------------------------------------------
const deliverOtp = async (
  user: { email: string | null; phone: string | null; username: string },
  otp: number,
  template: "createAccount" | "resetPassword",
) => {
  if (user.email) {
    try {
      const emailTpl =
        template === "createAccount"
          ? emailTemplate.createAccount({ name: user.username, email: user.email, otp })
          : emailTemplate.resetPassword({ email: user.email, otp });
      await emailHelper.sendEmail(emailTpl);
    } catch (err: any) {
      console.error("Failed to send OTP email:", err?.message || err);
    }
  } else if (user.phone) {
    try {
      await smsHelper.sendSms({
        to: user.phone.startsWith("+") ? user.phone : `+${user.phone}`,
        body: `Your Chaim verification code is: ${otp}. Valid for 10 minutes.`,
      });
    } catch (err: any) {
      console.error("Failed to send OTP SMS:", err?.message || err);
    }
  }
};

// ---------------------------------------------------------------------------

const registerUser = async (payload: IRegisterUser) => {
  // At least one of email or phone must be provided (also enforced in validation)
  if (!payload.email && !payload.phone) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "At least one of email or phone number is required",
    );
  }

  // Check uniqueness within User table
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

  // Cross-model uniqueness: email/phone must not exist in Ambassador table either
  if (payload.email) {
    const ambassadorWithEmail = await prisma.ambassador.findUnique({
      where: { email: payload.email.trim().toLowerCase() },
    });
    if (ambassadorWithEmail) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        "This email is already registered as an ambassador account",
      );
    }
  }

  if (payload.phone) {
    const normalizedPhone = payload.phone.replace(/\D/g, "");
    const ambassadorWithPhone = await prisma.ambassador.findUnique({
      where: { phone: normalizedPhone },
    });
    if (ambassadorWithPhone) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        "This phone number is already registered as an ambassador account",
      );
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

  // Deliver OTP via email or SMS
  await deliverOtp(
    { email: result.email, phone: result.phone, username: result.username },
    otp,
    "createAccount",
  );

  // Handle ambassador referral code attribution on registration
  if (payload.referralCode && payload.referralCode.trim() !== "") {
    try {
      const ambassador = await prisma.ambassador.findUnique({
        where: { referralCode: payload.referralCode.trim().toUpperCase() },
      });

      if (ambassador && ambassador.status === "ACTIVE") {
        // Track user-level referral attribution
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
  const rawIdentifier =
    payload.identifier || payload.email || payload.phone || "";
  const { password } = payload;

  const user = await findUserByIdentifier(rawIdentifier);

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
    verifyToken = jwtHelper.verifyToken(token, config.jwt.jwt_secret as Secret);
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

  const isPasswordMatched = await bcrypt.compare(payload.oldPassword, user.password);
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
  const user = await findUserByIdentifier(payload.identifier);

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found with this email or phone");
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

  await prisma.user.update({
    where: { id: user.id },
    data: { otp, otpExpiry },
  });

  await deliverOtp(
    { email: user.email, phone: user.phone, username: user.username },
    otp,
    "resetPassword",
  );

  return {
    message: "OTP sent to your registered email or phone",
  };
};

const verifyOtp = async (payload: IVerifyOtp) => {
  const user = await findUserByIdentifier(payload.identifier);

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
  const user = await findUserByIdentifier(payload.identifier);

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

const resendOtp = async (payload: { identifier: string }) => {
  const user = await findUserByIdentifier(payload.identifier);

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found with this email or phone");
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.user.update({
    where: { id: user.id },
    data: { otp, otpExpiry },
  });

  await deliverOtp(
    { email: user.email, phone: user.phone, username: user.username },
    otp,
    "createAccount",
  );

  return {
    message: "OTP resent successfully",
  };
};

const demoLogin = async (payload: IDemoLogin) => {
  const { role } = payload;
  let user: any = null;

  if (role === "admin") {
    user = await prisma.user.findFirst({
      where: { role: UserRole.SUPER_ADMIN, isDeleted: false },
    });
  } else if (role === "user1" || role === "user") {
    // User with listing
    user = await prisma.user.findFirst({
      where: {
        apartment: { isNot: null },
        role: UserRole.USER,
        isDeleted: false,
      },
    });
    if (!user) {
      user = await prisma.user.findFirst({
        where: { email: "user1@shabosrent.com" },
      });
    }
  } else if (role === "user2") {
    // Fresh user without listing
    user = await prisma.user.findFirst({
      where: {
        apartment: null,
        role: UserRole.USER,
        isDeleted: false,
      },
    });
    if (!user) {
      user = await prisma.user.findFirst({
        where: { email: "user2@shabosrent.com" },
      });
    }
  } else if (role === "ambassador") {
    const amb = await prisma.ambassador.findFirst({
      where: { status: "ACTIVE" },
    });
    if (!amb) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        "No active ambassador found in database. Please seed the database first.",
      );
    }
    const jwtPayload = {
      id: amb.id,
      name: amb.name,
      email: amb.email,
      phone: amb.phone,
      referralCode: amb.referralCode,
      role: "AMBASSADOR",
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
    const { password: _, ...ambData } = amb;
    return {
      accessToken,
      refreshToken,
      user: { ...ambData, role: "AMBASSADOR" },
    };
  }

  if (!user) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      `No demo account found for role "${role}". Please seed the database first.`,
    );
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

  const { password: _, ...userData } = user;

  return {
    accessToken,
    refreshToken,
    user: userData,
  };
};

export const AuthServices = {
  registerUser,
  loginUser,
  demoLogin,
  refreshToken,
  changePassword,
  forgotPassword,
  verifyOtp,
  resendOtp,
  resetPassword,
};
