import { createServerFn } from "@tanstack/react-start";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "../supabase/server";

function getServiceClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !serviceKey) throw new Error("Missing Supabase service environment variables.");
  return createServiceClient(url, serviceKey);
}

/**
 * Record credit spend for agent work. Balance stays derived (sum of ledger).
 * The agent / server calls this after reserving work — never from the browser
 * directly with a service key. Auth is the signed-in user; the ledger write
 * itself runs as service_role so RLS (select-only for users) still holds.
 */
export const spendCredits = createServerFn({ method: "POST" })
  .validator((data: { amount: number; note?: string }) => data)
  .handler(async ({ data }) => {
    const amount = Math.floor(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { error: "Spend amount must be a positive whole number of credits." };
    }
    const note = typeof data.note === "string" ? data.note.slice(0, 280) : null;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You need to be signed in to spend credits." };

    const service = getServiceClient();
    const { data: rows, error: balanceError } = await service
      .from("credit_ledger")
      .select("amount")
      .eq("owner_id", user.id);
    if (balanceError) return { error: balanceError.message };

    const balance = (rows ?? []).reduce(
      (total, row) => total + (typeof row.amount === "number" ? row.amount : 0),
      0,
    );
    if (balance < amount) {
      return { error: `Insufficient credits. Balance is ${balance.toLocaleString()}.` };
    }

    const { error: insertError } = await service.from("credit_ledger").insert({
      owner_id: user.id,
      amount: -amount,
      kind: "spend",
      event_id: `spend_${crypto.randomUUID()}`,
      note,
    });
    if (insertError) return { error: insertError.message };
    return { error: null as string | null, balance: balance - amount };
  });
