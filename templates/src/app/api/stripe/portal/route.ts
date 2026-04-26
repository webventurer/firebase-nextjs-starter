import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { isAuthError, verifyAuth } from "@/lib/api/auth";
import {
  badRequestError,
  handleError,
  notFoundError,
  serverError,
  successResponse,
} from "@/lib/api/responses";
import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { getStripe } from "@/lib/stripe";

// Creates a Stripe Billing Portal session so the user can manage their subscription
// (update card, cancel, view invoices). Reads stripeCustomerId from the user's
// Firestore doc — set this when you create the customer in the checkout route or
// the webhook.

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (isAuthError(auth)) return auth.error;

    if (!isAdminConfigured || !adminDb)
      return serverError("Server not configured");

    const userDoc = await adminDb.collection("users").doc(auth.userId).get();
    if (!userDoc.exists) return notFoundError("User");

    const customerId = userDoc.data()?.stripeCustomerId;
    if (!customerId)
      return badRequestError("No Stripe customer found for this account");

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL;
    if (!origin) return serverError("Missing NEXT_PUBLIC_APP_URL");

    const { returnUrl } = await req.json().catch(() => ({}));
    const finalReturnUrl = returnUrl || `${origin}/dashboard`;

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: finalReturnUrl,
    });

    return successResponse({ url: session.url });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 },
      );
    }
    return handleError(error, "Failed to create portal session");
  }
}
