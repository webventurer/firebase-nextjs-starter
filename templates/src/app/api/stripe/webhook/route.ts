import { FieldValue } from "firebase-admin/firestore";
import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { getPlanFromPriceId, getStripe } from "@/lib/stripe";

// Stripe webhook handler.
//   1. Verifies the signature using STRIPE_WEBHOOK_SECRET
//   2. Records the event ID for idempotency (collection: stripeEvents)
//   3. On subscription / checkout events, syncs the user's plan to Firestore
//
// To use: in the Stripe dashboard, add a webhook endpoint pointing at
// https://YOUR_DOMAIN/api/stripe/webhook. Subscribe to:
//   - checkout.session.completed
//   - customer.subscription.{created,updated,deleted}
// Set STRIPE_WEBHOOK_SECRET from the dashboard's signing secret.

export const runtime = "nodejs";

async function isEventProcessed(eventId: string): Promise<boolean> {
  const doc = await adminDb!.collection("stripeEvents").doc(eventId).get();
  return doc.exists;
}

async function recordProcessedEvent(
  event: Stripe.Event,
  customerId: string | null,
) {
  await adminDb!.collection("stripeEvents").doc(event.id).set({
    eventId: event.id,
    eventType: event.type,
    customerId,
    processedAt: FieldValue.serverTimestamp(),
  });
}

function customerIdFromEvent(event: Stripe.Event): string | null {
  const obj = event.data.object as { customer?: string | { id: string } };
  if (!obj.customer) return null;
  return typeof obj.customer === "string" ? obj.customer : obj.customer.id;
}

// Find the user doc for a Stripe customer. Tries the indexed lookup first;
// if no match (e.g. the customer was just created), falls back to the
// firebaseUid metadata that the checkout route stamps on the customer.
async function findUserDocForCustomer(
  customerId: string,
  firebaseUid?: string,
) {
  const byCustomerId = await adminDb!
    .collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();
  if (!byCustomerId.empty) return byCustomerId.docs[0];

  if (firebaseUid) {
    const byUid = await adminDb!.collection("users").doc(firebaseUid).get();
    if (byUid.exists) return byUid;
  }
  return null;
}

async function syncSubscriptionToUser(
  sub: Stripe.Subscription,
  customerId: string,
) {
  const firebaseUid = sub.metadata?.firebaseUid;
  const userDoc = await findUserDocForCustomer(customerId, firebaseUid);
  if (!userDoc) {
    console.warn(`[stripe] no user doc for customer ${customerId}`);
    return;
  }

  const priceId = sub.items.data[0]?.price.id;
  const plan = priceId ? getPlanFromPriceId(priceId) : null;
  const isActive = sub.status === "active" || sub.status === "trialing";

  await userDoc.ref.set(
    {
      plan: isActive && plan ? plan.key : "free",
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      stripeSubscriptionStatus: sub.status,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function POST(req: NextRequest) {
  if (!isAdminConfigured || !adminDb) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 },
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Signature verification failed: ${msg}` },
      { status: 400 },
    );
  }

  if (await isEventProcessed(event.id)) {
    return NextResponse.json({ received: true, idempotent: true });
  }

  const customerId = customerIdFromEvent(event);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && customerId) {
          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string,
          );
          await syncSubscriptionToUser(sub, customerId);
        } else if (session.metadata?.firebaseUid && customerId) {
          // One-time payment (no subscription): stamp the customer ID so the
          // portal route can find them later.
          await adminDb
            .collection("users")
            .doc(session.metadata.firebaseUid)
            .set({ stripeCustomerId: customerId }, { merge: true });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        if (customerId) await syncSubscriptionToUser(sub, customerId);
        break;
      }

      case "invoice.payment_failed":
        // TODO: notify the user, optionally downgrade after the grace period
        console.warn(`[stripe] payment failed for ${customerId}`);
        break;

      default:
        // Unhandled event types are recorded but not acted on
        break;
    }
  } catch (error) {
    // Return 500 so Stripe retries. We deliberately do NOT record the event
    // as processed — the idempotency check will pass on retry.
    console.error(`[stripe] error handling ${event.type}:`, error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  await recordProcessedEvent(event, customerId);
  return NextResponse.json({ received: true });
}
