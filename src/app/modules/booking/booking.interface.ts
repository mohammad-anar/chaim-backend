import { BookingStatus } from "@prisma/client";

export type ICreateBooking = {
  apartmentId: string;
  weekendId: string;
  totalAmount: number;
};

export type IUpdateBookingStatus = {
  status: BookingStatus;
};
