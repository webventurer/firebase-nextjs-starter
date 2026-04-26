import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { isAuthError, verifyAuth } from "@/lib/api/auth";
import {
  badRequestError,
  handleError,
  serverError,
  successResponse,
} from "@/lib/api/responses";
import { getStripe } from "@/lib/stripe";

// Creates a Stripe Checkout session for the authenticated user.
// Body: { priceId: string }
// Returns: { sessionId, url }
//
// Detects subscription vs one-time payment from the price.type and configures
// the session accordingly. Looks up the customer by email or creates one,
// stamping firebaseUid into Stripe metadata so the webhook can match Stripe
// customers back to Firebase users.

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (isAuthError(auth)) return auth.error;
    if (!auth.email) return badRequestError("User email is required");

    const { priceId } = await req.json();
    if (!priceId) return badRequestError("Price ID is required");

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL;
    if (!origin) return serverError("Missing NEXT_PUBLIC_APP_URL");

    const stripe = getStripe();

    const existing = await stripe.customers.list({
      email: auth.email,
      limit: 1,
    });
    let customerId = existing.data[0]?.id;
    if (!customerId) {
      const created = await stripe.customers.create({
        email: auth.email,
        metadata: { firebaseUid: auth.userId },
      });
      customerId = created.id;
    } else if (!existing.data[0].metadata?.firebaseUid) {
      await stripe.customers.update(customerId, {
        metadata: { firebaseUid: auth.userId },
      });
    }

    const price = await stripe.prices.retrieve(priceId);
    const isSubscription = price.type === "recurring";

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: isSubscription ? "subscription" : "payment",
      success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?checkout=canceled`,
      metadata: { firebaseUid: auth.userId, priceId },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    };

    if (isSubscription) {
      sessionConfig.subscription_data = {
        metadata: { firebaseUid: auth.userId, priceId },
      };
    } else {
      sessionConfig.payment_intent_data = {
        metadata: { firebaseUid: auth.userId, priceId },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    return successResponse({ sessionId: session.id, url: session.url });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 },
      );
    }
    return handleError(error, "Failed to create checkout session");
  }
}
