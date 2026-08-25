import { AlertType, Prisma, UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError.js";
import { prisma } from "../../../helpers/prisma.js";
import { getIO } from "../../../helpers/socketHelper.js";
import { ICreateAlertPayload, IUpdateAlertPayload } from "./alert.interface.js";

const createAlert = async (payload: ICreateAlertPayload) => {
  const alert = await prisma.alert.create({
    data: {
      title: payload.title,
      message: payload.message,
      type: payload.type || AlertType.INFO,
      targetRole: payload.targetRole || null,
      isActive: payload.isActive !== undefined ? payload.isActive : true,
    },
  });

  // Real-time broadcast via socket
  try {
    const io = getIO();
    io.emit("newAlert", alert);
  } catch (err) {
    console.error("[AlertService] Socket broadcast failed:", err);
  }

  return alert;
};

const getAllAlerts = async (query: {
  type?: AlertType;
  targetRole?: UserRole;
  isActive?: string;
}) => {
  const where: Prisma.AlertWhereInput = {};

  if (query.type) {
    where.type = query.type;
  }

  if (query.targetRole) {
    where.targetRole = query.targetRole;
  }

  if (query.isActive !== undefined) {
    where.isActive = query.isActive === "true";
  }

  return await prisma.alert.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
};

const getActiveAlertsForUser = async (userRole?: UserRole, userId?: string) => {
  return await prisma.alert.findMany({
    where: {
      isActive: true,
      OR: [
        { targetRole: null, targetUserId: null },
        ...(userRole ? [{ targetRole: userRole }] : []),
        ...(userId ? [{ targetUserId: userId }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });
};

const updateAlert = async (id: string, payload: IUpdateAlertPayload) => {
  const existing = await prisma.alert.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Alert not found");
  }

  return await prisma.alert.update({
    where: { id },
    data: payload,
  });
};

const deleteAlert = async (id: string) => {
  const existing = await prisma.alert.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Alert not found");
  }

  return await prisma.alert.delete({
    where: { id },
  });
};

export const AlertService = {
  createAlert,
  getAllAlerts,
  getActiveAlertsForUser,
  updateAlert,
  deleteAlert,
};
