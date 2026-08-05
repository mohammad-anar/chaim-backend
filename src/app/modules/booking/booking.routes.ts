import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { BookingController } from "./booking.controller.js";
import { BookingValidation } from "./booking.validation.js";

const router = express.Router();

router.post(
  "/",
  auth(),
  validateRequest(BookingValidation.createBookingZodSchema),
  BookingController.createBooking,
);

router.get("/my-bookings", auth(), BookingController.getMyBookings);

router.get("/apartment/:apartmentId", auth(), BookingController.getApartmentBookings);

router.patch("/cancel/:id", auth(), BookingController.cancelBooking);

export const BookingRoutes = router;
