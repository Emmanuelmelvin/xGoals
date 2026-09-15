import { createServerFn } from "@tanstack/react-start";
import { createClient } from "../supabase/server";
import {
  creditsForCents,
  formatCentsToUsd,
  getCreditConfig,
  parseUsdToCents,
  quantizeCentsToNickel,
  validatePurchaseCents,
} from "../../components/dashboard/credit-math";
import { logger } from "../logger";
import { env } from "../env";

type BachsCheckoutResponse = {
  checkout_id?: unknown;
  checkout_url?: unknown;
};

export const createCreditCheckout = createServerFn({ method: "POST" })
  .validator((data: { usdAmount: string }) => data)
  .handler(async ({ data }) => {
    const apiKey = env.BACHS_API_KEY;
    const baseUrl = env.BACHS_API_BASE_URL ?? "https://sandbox-api.bachs.io";
    const appUrl = env.APP_URL ?? "http://127.0.0.1:3000";
    if (!apiKey) {
      logger.warn("checkout bachs api key not configured");
      return { checkoutUrl: null as string | null, error: "Billing is not configured yet." };
    }

    const config = getCreditConfig();
    const parsedCents = parseUsdToCents(data.usdAmount);
    if (parsedCents === null) return { checkoutUrl: null as string | null, error: "Enter an amount in dollars." };
    const cents = quantizeCentsToNickel(parsedCents);
    const amountError = validatePurchaseCents(cents, config);
    if (amountError) return { checkoutUrl: null as string | null, error: amountError };
    const credits = creditsForCents(cents, config.creditsPerUsd);
    if (credits === null) return { checkoutUrl: null as string | null, error: "That amount can't map to whole credits." };
    const amount = formatCentsToUsd(cents);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { checkoutUrl: null as string | null, error: "You need to be signed in to buy credits." };
    if (!user.email) {
      return { checkoutUrl: null as string | null, error: "Your account has no email address for the receipt." };
    }

    // Name the Bachs customer with the buyer's X handle, matching how the
    // workspace identifies them everywhere else.
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const rawHandle =
      (typeof metadata.user_name === "string" && metadata.user_name) ||
      (typeof metadata.preferred_username === "string" && metadata.preferred_username) ||
      (typeof metadata.screen_name === "string" && metadata.screen_name) ||
      null;
    const customerName = rawHandle ? `@${rawHandle.replace(/^@/, "")}` : null;

    const { data: purchase, error: purchaseError } = await supabase
      .from("credit_purchases")
      .insert({ owner_id: user.id, checkout_id: `pending_${crypto.randomUUID()}`, usd_amount: amount, credits })
      .select("id")
      .single();

    if (purchaseError || !purchase) {
      logger.error("checkout purchase insert failed", { error: purchaseError?.message, owner_id: user.id });
      return { checkoutUrl: null as string | null, error: purchaseError?.message ?? "Could not start the purchase." };
    }

    logger.info("checkout purchase created", { purchase_id: purchase.id, owner_id: user.id, amount, credits });

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/v1/checkout-sessions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          pricing: { currency: "USD", amount },
          customer: customerName ? { email: user.email, name: customerName } : { email: user.email },
          success_url: `${appUrl}/app/credits`,
          cancel_url: `${appUrl}/app/credits`,
          reference: purchase.id,
          metadata: { xgoal_user_id: user.id, xgoal_purchase_id: purchase.id },
          expires_in_minutes: 60,
        }),
      });
    } catch (err) {
      logger.error("checkout bachs fetch failed", { error: err instanceof Error ? err.message : String(err), purchase_id: purchase.id });
      await supabase.from("credit_purchases").update({ status: "failed" }).eq("id", purchase.id);
      return { checkoutUrl: null as string | null, error: "Could not reach the payment provider. Try again." };
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      logger.warn("checkout bachs non-ok response", { status: response.status, purchase_id: purchase.id, body: bodyText.slice(0, 500) });
      await supabase.from("credit_purchases").update({ status: "failed" }).eq("id", purchase.id);
      return { checkoutUrl: null as string | null, error: "The checkout could not be created. Try again." };
    }

    const body = (await response.json()) as BachsCheckoutResponse;
    const checkoutId = typeof body.checkout_id === "string" ? body.checkout_id : null;
    const checkoutUrl = typeof body.checkout_url === "string" ? body.checkout_url : null;
    if (!checkoutId || !checkoutUrl) {
      await supabase.from("credit_purchases").update({ status: "failed" }).eq("id", purchase.id);
      return { checkoutUrl: null as string | null, error: "The checkout response was unexpected. Try again." };
    }

    const { error: linkError } = await supabase.from("credit_purchases").update({ checkout_id: checkoutId }).eq("id", purchase.id);
    if (linkError) {
      logger.error("checkout link failed", { error: linkError.message, purchase_id: purchase.id, checkout_id: checkoutId });
      return { checkoutUrl: null as string | null, error: "The purchase could not be linked. Try again." };
    }
    logger.info("checkout session created", { purchase_id: purchase.id, checkout_id: checkoutId });
    return { checkoutUrl, error: null as string | null };
  });
