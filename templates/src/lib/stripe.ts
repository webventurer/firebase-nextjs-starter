import { loadStripe } from "@stripe/stripe-js";
import Stripe from "stripe";

// Client-side Stripe singleton (lazy)
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

let stripeInstance: Stripe | null = null;

// Server-side Stripe singleton. Throws if STRIPE_SECRET_KEY is missing.
export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2026-02-25.clover",
    });
  }
  return stripeInstance;
}

// Nullable variant for code paths where Stripe is optional.
export function getStripeOrNull(): Stripe | null {
  try {
    return getStripe();
  } catch {
    return null;
  }
}

// Map Stripe price IDs to plan keys. Replace the placeholder shape with your
// real plans. The webhook reads this map to update users/{uid}.plan when
// subscriptions change.
//
// Set the env vars in .env.local (and apphosting.yaml for production) to the
// price IDs from your Stripe dashboard.
export const PLANS = {
  free: {
    key: "free",
    name: "Free",
    priceId: null,
    billing: null,
  },
  pro_monthly: {
    key: "pro",
    name: "Pro (monthly)",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
    billing: "monthly" as const,
  },
  pro_annual: {
    key: "pro",
    name: "Pro (annual)",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL,
    billing: "annual" as const,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getPlanFromPriceId(priceId: string) {
  for (const plan of Object.values(PLANS)) {
    if (plan.priceId === priceId) return plan;
  }
  return null;
}
