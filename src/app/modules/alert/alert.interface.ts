import { AlertType, UserRole } from "@prisma/client";

export interface ICreateAlertPayload {
  title: string;
  message: string;
  type?: AlertType;
  targetRole?: UserRole;
  targetUserId?: string;
  link?: string;
  isActive?: boolean;
}

export interface IUpdateAlertPayload {
  title?: string;
  message?: string;
  type?: AlertType;
  targetRole?: UserRole;
  targetUserId?: string;
  link?: string;
  isActive?: boolean;
}
