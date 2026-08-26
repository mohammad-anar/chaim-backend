export type IRegisterUser = {
  username: string;
  email?: string;
  phone?: string;
  password: string;
  profileImage?: string;
  referralCode?: string;
};

export type ILoginUser = {
  email: string;
  password: string;
};

export type IChangePassword = {
  oldPassword: string;
  newPassword: string;
};

export type IForgotPassword = {
  email: string;
};

export type IVerifyOtp = {
  email: string;
  otp: number;
};

export type IResetPassword = {
  email: string;
  otp: number;
  newPassword: string;
};

export type IRefreshToken = {
  refreshToken: string;
};
