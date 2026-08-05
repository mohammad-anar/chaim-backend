import { SwapStatus } from "@prisma/client";

export type ICreateSwapRequest = {
  toAppId: string;
};

export type IUpdateSwapStatus = {
  status: SwapStatus;
};
