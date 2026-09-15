import { createFileRoute } from "@tanstack/react-router";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";

export const Route = createFileRoute("/api/bachs/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.BACHS_WEBHOOK_SECRET;
        if (!secret) {
          console.error("[bachs-webhook] BACHS_WEBHOOK_SECRET is not configured.");
          return json({ error: "Webhook not configured." }, 500);
        }

        const rawBody = await request.text();
        const signatureV2 = request.headers.get("x-bachs-signature-v2");
        const timestampHeader = request.headers.get("x-bachs-timestamp");
        const signatureV1 = request.headers.get("x-bachs-signature");
        if (!verifySignature({ rawBody, secret, signatureV2, timestampHeader, signatureV1 })) {
          return json({ error: "Invalid signature." }, 401);
        }

        let envelope: unknown;
        try {
          envelope = JSON.parse(rawBody);
        } catch {
          return json({ error: "Invalid JSON." }, 400);
        }

        const event = parseEnvelope(envelope);
        if (!event) return json({ received: true }, 200);

        try {
          await handleEvent(event);
        } catch (err) {
          console.error("[bachs-webhook] Handler failed, will retry.", err);
          return json({ error: "Handler failed." }, 500);
        }
        return json({ received: true }, 200);
      },
    },
  },
});

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function verifySignature({
  rawBody,
  secret,
  signatureV2,
  timestampHeader,
  signatureV1,
}: {
  rawBody: string;
  secret: string;
  signatureV2: string | null;
  timestampHeader: string | null;
  signatureV1: string | null;
}): boolean {
  // Prefer V2 (t=...,v1=...[,v1=...]) so secret rotation keeps verifying.
  if (signatureV2) {
    const parts = signatureV2.split(",").map((part) => part.trim());
    const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
    const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
    if (!timestamp || signatures.length === 0) return false;
    if (!isFresh(timestamp)) return false;
    const expected = digest(secret, timestamp, rawBody);
    return signatures.some((signature) => safeEqualHex(expected, signature));
  }
  if (timestampHeader && signatureV1) {
    if (!isFresh(timestampHeader)) return false;
    return safeEqualHex(digest(secret, timestampHeader, rawBody), signatureV1.trim());
  }
  return false;
}

function digest(secret: string, timestamp: string, rawBody: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function isFresh(timestampHeader: string, toleranceSeconds = 300): boolean {
  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) return false;
  return Math.abs(Date.now() / 1000 - timestamp) <= toleranceSeconds;
}

type BachsEvent = { id: string; type: string; data: Record<string, unknown> };

function parseEnvelope(envelope: unknown): BachsEvent | null {
  if (typeof envelope !== "object" || envelope === null) return null;
  const record = envelope as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.type !== "string") return null;
  // Parse leniently: Bachs may add fields at any time.
  const data = typeof record.data === "object" && record.data !== null ? (record.data as Record<string, unknown>) : {};
  return { id: record.id, type: record.type, data };
}

function getServiceClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !serviceKey) throw new Error("Missing Supabase service environment variables.");
  return createServiceClient(url, serviceKey);
}

async function handleEvent(event: BachsEvent) {
  if (event.type === "collection.succeeded") {
    await fulfillPurchase(event);
    return;
  }
  if (event.type === "checkout.expired" || event.type === "collection.failed" || event.type === "collection.underpaid") {
    await markPurchase(event, event.type === "checkout.expired" ? "expired" : "failed");
    return;
  }
}

async function markPurchase(event: BachsEvent, status: "expired" | "failed") {
  const checkoutId = typeof event.data.checkout_id === "string" ? event.data.checkout_id : null;
  if (!checkoutId) return;
  const supabase = getServiceClient();
  await supabase.from("credit_purchases").update({ status }).eq("checkout_id", checkoutId).eq("status", "open");
}

async function fulfillPurchase(event: BachsEvent) {
  const supabase = getServiceClient();

  // At-least-once delivery: the event id dedupes retries.
  const { data: seen } = await supabase.from("credit_ledger").select("id").eq("event_id", event.id).limit(1);
  if (seen && seen.length > 0) return;

  const checkoutId = typeof event.data.checkout_id === "string" ? event.data.checkout_id : null;
  if (!checkoutId) {
    console.warn("[bachs-webhook] collection.succeeded without checkout_id.");
    return;
  }
  const { data: purchase } = await supabase.from("credit_purchases").select("id,owner_id,credits,usd_amount,status").eq("checkout_id", checkoutId).single();
  if (!purchase) {
    console.warn("[bachs-webhook] No purchase for checkout; skipping fulfilment.");
    return;
  }
  if (purchase.status === "completed") return;

  // The purchase intent is authoritative: the checkout total was fixed in USD
  // at session creation, so a succeeded collection for this checkout fulfils
  // exactly the agreed credits — regardless of which currency the buyer paid
  // in. (Underpayment arrives as collection.underpaid, never as succeeded.)
  const amount = typeof event.data.amount === "string" ? event.data.amount : null;
  const currency = typeof event.data.currency === "string" ? event.data.currency : null;
  if (amount !== null && currency !== null && !(currency === "USD" && amount === purchase.usd_amount)) {
    console.warn("[bachs-webhook] Settlement differs from the purchase intent; crediting intent value.", {
      settled: `${amount} ${currency}`,
      intent: `${purchase.usd_amount} USD`,
    });
  }

  const { error: ledgerError } = await supabase.from("credit_ledger").insert({
    owner_id: purchase.owner_id,
    amount: purchase.credits,
    kind: "purchase",
    checkout_id: checkoutId,
    event_id: event.id,
    usd_amount: purchase.usd_amount,
  });
  if (ledgerError) {
    // A parallel delivery already credited this event — still ensure the purchase reads completed.
    if (ledgerError.code === "23505") {
      await supabase.from("credit_purchases").update({ status: "completed" }).eq("id", purchase.id);
      return;
    }
    throw ledgerError;
  }
  await supabase.from("credit_purchases").update({ status: "completed" }).eq("id", purchase.id);
}
