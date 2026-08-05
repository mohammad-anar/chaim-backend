import { OfferStatus } from "@prisma/client";

export type ICreateOffer = {
  apartmentId: string;
  shabbosId?: string;
  offerPrice: number;
  message?: string;
};

export type IUpdateOfferStatus = {
  status: OfferStatus;
};
