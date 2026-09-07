export type IRegisterUser = {
  username: string;
  email?: string;
  phone?: string;
  password: string;
  confirmPassword?: string;
  profileImage?: string;
  referralCode?: string | null;
  marketingPlatformId?: string | null;
};

export type ILoginUser = {
  identifier?: string; // email or phone
  email?: string;
  phone?: string;
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
  identifier: string; // email or phone
};

export type IVerifyOtp = {
  identifier: string; // email or phone
  otp: number;
};

export type IResetPassword = {
  identifier: string; // email or phone
  otp: number;
  newPassword: string;
};

export type IRefreshToken = {
  refreshToken: string;
};
