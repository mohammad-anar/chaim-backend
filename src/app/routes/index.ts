import express from "express";
import { ApartmentRoutes } from "../modules/apartment/apartment.routes.js";
import { ApartmentAvailabilityRoutes } from "../modules/apartmentAvailability/apartmentAvailability.routes.js";
import { AuthRoutes } from "../modules/auth/auth.routes.js";
import { BookingRoutes } from "../modules/booking/booking.routes.js";
import { CallLogRoutes } from "../modules/callLog/callLog.routes.js";
import { ContactRoutes } from "../modules/contact/contact.routes.js";
import { InterestedRequestRoutes } from "../modules/interestedRequest/interestedRequest.routes.js";
import { NotifyRequestRoutes } from "../modules/notifyRequest/notifyRequest.routes.js";
import { OfferRoutes } from "../modules/offer/offer.routes.js";
import { PaymentRoutes } from "../modules/payment/payment.routes.js";
import { ReportRentedRoutes } from "../modules/reportRented/reportRented.routes.js";
import { ReviewRoutes } from "../modules/review/review.routes.js";
import { SwapRoutes } from "../modules/swap/swap.routes.js";
import { SwapPreferenceRoutes } from "../modules/swapPreference/swapPreference.routes.js";
import { UserRouter } from "../modules/user/user.routes.js";
import { WeekendCalendarRoutes } from "../modules/weekendCalendar/weekendCalendar.routes.js";
import { WishlistRoutes } from "../modules/wishlist/wishlist.routes.js";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/user",
    route: UserRouter,
  },
  {
    path: "/apartment",
    route: ApartmentRoutes,
  },
  {
    path: "/weekend-calendar",
    route: WeekendCalendarRoutes,
  },
  {
    path: "/apartment-availability",
    route: ApartmentAvailabilityRoutes,
  },
  {
    path: "/payment",
    route: PaymentRoutes,
  },
  {
    path: "/wishlist",
    route: WishlistRoutes,
  },
  {
    path: "/review",
    route: ReviewRoutes,
  },
  {
    path: "/swap-preference",
    route: SwapPreferenceRoutes,
  },
  {
    path: "/swap",
    route: SwapRoutes,
  },
  {
    path: "/booking",
    route: BookingRoutes,
  },
  {
    path: "/contact",
    route: ContactRoutes,
  },
  {
    path: "/call",
    route: CallLogRoutes,
  },
  {
    path: "/offer",
    route: OfferRoutes,
  },
  {
    path: "/interested-request",
    route: InterestedRequestRoutes,
  },
  {
    path: "/notify-request",
    route: NotifyRequestRoutes,
  },
  {
    path: "/report-rented",
    route: ReportRentedRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
