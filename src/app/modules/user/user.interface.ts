import { UserRole, UserStatus } from "@prisma/client";

export type IUpdateProfile = {
  username?: string;
  email?: string;
  phone?: string;
};

export type IUpdateUserStatus = {
  status: UserStatus;
};

export type IUserFilterRequest = {
  searchTerm?: string;
  role?: UserRole;
  status?: UserStatus;
};
