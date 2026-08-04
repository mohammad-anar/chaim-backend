import Stripe from "stripe";
import config from "../config/index.js";

export const stripe = new Stripe(config.stripe.secret_key || "", {
  apiVersion: "2025-01-27.acacia" as any,
});
