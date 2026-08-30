import { MarketingPlatformStatus } from "@prisma/client";

export interface ICreateMarketingPlatformPayload {
  title: string;
  platform: string;
  status?: MarketingPlatformStatus;
}

export interface IUpdateMarketingPlatformPayload {
  title?: string;
  platform?: string;
  status?: MarketingPlatformStatus;
}

export interface IMarketingPlatformFilterRequest {
  searchTerm?: string;
  status?: MarketingPlatformStatus;
  platform?: string;
}
