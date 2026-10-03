import { AdvertisementPosition } from "@prisma/client";

export interface ICreateAdvertisementPayload {
  companyName?: string;
  title: string;
  subtitle?: string;
  image?: string;
  url?: string;
  targetUrl?: string; // alias for url
  position?: AdvertisementPosition;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface IUpdateAdvertisementPayload {
  companyName?: string;
  title?: string;
  subtitle?: string;
  image?: string;
  url?: string;
  targetUrl?: string; // alias for url
  position?: AdvertisementPosition;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}
