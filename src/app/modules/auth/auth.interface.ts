export type IRegisterUser = {
  username: string;
  email?: string;
  phone?: string;
  password: string;
  confirmPassword?: string;
  profileImage?: string;
  role?: "USER" | "OWNER" | "SUPER_ADMIN";
  referralCode?: string | null;
  marketingPlatformId?: string | null;
};

export type ILoginUser = {
  identifier?: string; // email, phone, or username
  email?: string;
  phone?: string;
  username?: string;
  password: string;
};

export type IDemoLogin = {
  role: "admin" | "user" | "user1" | "user2" | "ambassador";
};

export type IChangePassword = {
  oldPassword: string;
  newPassword: string;
};

export type IForgotPassword = {
  email?: string;
  identifier?: string; // email
};

export type IVerifyOtp = {
  identifier: string; // email
  otp: number;
};

export type IResetPassword = {
  token?: string;
  identifier?: string;
  otp?: number;
  newPassword: string;
  confirmPassword?: string;
  confirmNewPassword?: string;
};

export type IRefreshToken = {
  refreshToken: string;
};
