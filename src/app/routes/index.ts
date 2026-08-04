import express from "express";
import { ApartmentRoutes } from "../modules/apartment/apartment.routes.js";
import { ApartmentAvailabilityRoutes } from "../modules/apartmentAvailability/apartmentAvailability.routes.js";
import { AuthRoutes } from "../modules/auth/auth.routes.js";
import { PaymentRoutes } from "../modules/payment/payment.routes.js";
import { UserRouter } from "../modules/user/user.routes.js";
import { WeekendCalendarRoutes } from "../modules/weekendCalendar/weekendCalendar.routes.js";

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
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
