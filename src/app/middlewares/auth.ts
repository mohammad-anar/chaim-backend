import config from "../../config/index.js";
import ApiError from "../../errors/ApiError.js";
import { NextFunction, Request, Response } from "express";
import { jwtHelper } from "../../helpers/jwtHelper.js";
import { prisma } from "../../helpers/prisma.js";
import { StatusCodes } from "http-status-codes";
import { Secret } from "jsonwebtoken";

const cleanToken = (authHeader?: string): string => {
  if (!authHeader) return "";
  let token = authHeader.trim();
  // Remove quotes first if whole header is quoted
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }
  // Remove "Bearer" prefix (up to 2 times to handle Postman double Bearer)
  if (token.toLowerCase().startsWith("bearer")) {
    token = token.slice(6).trim();
  }
  if (token.toLowerCase().startsWith("bearer")) {
    token = token.slice(6).trim();
  }
  // Remove quotes again if inner token is quoted
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }
  return token.replace(/\s+/g, "");
};

const auth =
  (...roles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "You are not authorized");
      }

      const token = cleanToken(authHeader);
      if (!token) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "You are not authorized");
      }

      // Verify token with JWT
      const verifyUser = jwtHelper.verifyToken(
        token,
        config.jwt.jwt_secret as Secret,
      );

      // Verify user exists in database
      const user = await prisma.user.findUnique({
        where: { id: verifyUser.id },
        select: { id: true, isDeleted: true, status: true, role: true },
      });

      if (!user || user.isDeleted) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          "User does not exist or has been deleted. Please log in again.",
        );
      }

      if (user.status === "BLOCKED" || user.status === "SUSPENDED") {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          `Your account is ${user.status.toLowerCase()}`,
        );
      }

      // Set user into request
      req.user = verifyUser;

      // Check if user has required role (e.g. SUPER_ADMIN)
      if (roles.length && !roles.includes(user.role)) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You don't have permission to access this api",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export const optionalAuth =
  () => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = cleanToken(authHeader);
        if (token) {
          const verifyUser = jwtHelper.verifyToken(
            token,
            config.jwt.jwt_secret as Secret,
          );
          req.user = verifyUser;
        }
      }
      next();
    } catch (error) {
      next();
    }
  };

export default auth;

