import { AlertType, UserRole } from "@prisma/client";

export interface ICreateAlertPayload {
  title: string;
  message: string;
  type?: AlertType;
  targetRole?: UserRole;
  isActive?: boolean;
}

export interface IUpdateAlertPayload {
  title?: string;
  message?: string;
  type?: AlertType;
  targetRole?: UserRole;
  isActive?: boolean;
}
