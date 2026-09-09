import { UserRole, UserStatus } from "@prisma/client";

export type NotificationPreference = "EMAIL" | "PHONE" | "BOTH";

export type IUpdateProfile = {
  username?: string;
  email?: string;
  phone?: string;
  notificationPreference?: NotificationPreference;
  marketingPlatformId?: string | null;
};

export type IUpdateNotificationPreference = {
  notificationPreference: NotificationPreference;
};

export type IUpdateUserStatus = {
  status: UserStatus;
};

export type IUserFilterRequest = {
  searchTerm?: string;
  role?: UserRole;
  status?: UserStatus;
};
