import { ContactChannel } from "@prisma/client";

export type IInitiateCall = {
  receiverId?: string;
  apartmentId?: string;
  channel?: ContactChannel;
};

export type IInitiateWhatsApp = {
  apartmentId?: string;
  receiverId?: string;
  message?: string;
};
