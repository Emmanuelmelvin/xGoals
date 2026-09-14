import { createClient } from "../../lib/supabase/client";

export type CreditLedgerEntry = {
  id: string;
  amount: number;
  kind: "purchase" | "spend" | "adjustment";
  checkoutId: string | null;
  usdAmount: string | null;
  createdAt: string;
};

export type CreditPurchase = {
  id: string;
  checkoutId: string;
  usdAmount: string;
  credits: number;
  status: "open" | "completed" | "expired" | "failed" | "cancelled";
  createdAt: string;
};

function isLedgerKind(value: unknown): value is CreditLedgerEntry["kind"] {
  return value === "purchase" || value === "spend" || value === "adjustment";
}

function isPurchaseStatus(value: unknown): value is CreditPurchase["status"] {
  return value === "open" || value === "completed" || value === "expired" || value === "failed" || value === "cancelled";
}

export async function loadCreditBalance(ownerId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("credit_ledger").select("amount").eq("owner_id", ownerId);

  if (error) return { balance: 0, error: error.message };
  const balance = (data ?? []).reduce((total, row) => total + (typeof row.amount === "number" ? row.amount : 0), 0);
  return { balance, error: null as string | null };
}

export async function loadCreditHistory(ownerId: string, limit = 20) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("credit_ledger")
    .select("id,amount,kind,checkout_id,usd_amount,created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { entries: [] as CreditLedgerEntry[], error: error.message };
  return {
    entries: (data ?? []).map((row) => ({
      id: row.id as string,
      amount: typeof row.amount === "number" ? row.amount : 0,
      kind: isLedgerKind(row.kind) ? row.kind : "adjustment",
      checkoutId: typeof row.checkout_id === "string" ? row.checkout_id : null,
      usdAmount: typeof row.usd_amount === "string" ? row.usd_amount : null,
      createdAt: typeof row.created_at === "string" ? row.created_at : "",
    })),
    error: null as string | null,
  };
}

export async function loadOpenPurchases(ownerId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("credit_purchases")
    .select("id,checkout_id,usd_amount,credits,status,created_at")
    .eq("owner_id", ownerId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) return { purchases: [] as CreditPurchase[], error: error.message };
  return {
    purchases: (data ?? []).map((row) => ({
      id: row.id as string,
      checkoutId: row.checkout_id as string,
      usdAmount: row.usd_amount as string,
      credits: typeof row.credits === "number" ? row.credits : 0,
      status: isPurchaseStatus(row.status) ? row.status : "open",
      createdAt: typeof row.created_at === "string" ? row.created_at : "",
    })),
    error: null as string | null,
  };
}
