export type ICreateReview = {
  apartmentId: string;
  bookingId?: string;
  title?: string;
  message: string;
  rating: number;
};
