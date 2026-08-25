import { AdvertisementPosition } from "@prisma/client";

export interface ICreateAdvertisementPayload {
  title: string;
  image: string;
  targetUrl?: string;
  position?: AdvertisementPosition;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface IUpdateAdvertisementPayload {
  title?: string;
  image?: string;
  targetUrl?: string;
  position?: AdvertisementPosition;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}
