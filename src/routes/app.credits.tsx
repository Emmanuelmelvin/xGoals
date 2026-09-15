import { useEffect, useMemo, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useDashboard } from "../components/dashboard-layout";
import { createCreditCheckout } from "../lib/bachs/checkout-server-fns";
import {
  creditsForCents,
  formatCentsToDisplayUsd,
  formatCentsToUsd,
  getCreditConfig,
  isBachsTestMode,
  parseUsdToCents,
  quantizeCentsToNickel,
  validatePurchaseCents,
} from "../components/dashboard/credit-math";
import { loadCreditBalance, loadCreditHistory, loadOpenPurchases, type CreditLedgerEntry, type CreditPurchase } from "../components/dashboard/credit-persistence";
import { fieldInputClass } from "../components/dashboard/goal-form";
import { useToast } from "../components/toast";

export const Route = createFileRoute("/app/credits")({
  // Bachs appends ?checkout_id= when the customer returns from a paid checkout.
  validateSearch: (search: Record<string, unknown>): { checkout_id?: string } => ({
    checkout_id: typeof search.checkout_id === "string" && search.checkout_id ? search.checkout_id : undefined,
  }),
  head: () => ({
    meta: [{ title: "xGoal — Credits" }],
  }),
  component: CreditsPage,
});

const QUICK_AMOUNTS = ["5", "10", "25", "50", "100"] as const;

function formatLedgerDate(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function CreditsPage() {
  const { checkout_id: returnedCheckoutId } = Route.useSearch();
  const { user } = useDashboard();
  const { toast } = useToast();
  const announcedReturn = useRef<string | null>(null);

  const [balance, setBalance] = useState(0);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const [entries, setEntries] = useState<CreditLedgerEntry[]>([]);
  const [openPurchases, setOpenPurchases] = useState<CreditPurchase[]>([]);
  const [amount, setAmount] = useState("25");
  const [isSaving, setIsSaving] = useState(false);

  const config = useMemo(() => getCreditConfig(), []);
  const parsed = useMemo(() => {
    const cents = parseUsdToCents(amount);
    if (cents === null) return null;
    return quantizeCentsToNickel(cents);
  }, [amount]);
  const previewCredits = parsed === null ? null : creditsForCents(parsed, config.creditsPerUsd);
  const amountError = useMemo(() => {
    if (amount.trim() === "") return null;
    if (parsed === null) return "Enter an amount like 25.00.";
    return validatePurchaseCents(parsed, config);
  }, [amount, parsed, config]);
  const canBuy = parsed !== null && previewCredits !== null && !amountError && !isSaving;

  async function refresh() {
    setIsBalanceLoading(true);
    const [{ balance: nextBalance }, { entries: nextEntries }, { purchases: nextOpen }] = await Promise.all([
      loadCreditBalance(user.id),
      loadCreditHistory(user.id),
      loadOpenPurchases(user.id),
    ]);
    setBalance(nextBalance);
    setEntries(nextEntries);
    setOpenPurchases(nextOpen);
    setIsBalanceLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => {
    if (!returnedCheckoutId || announcedReturn.current === returnedCheckoutId) return;
    announcedReturn.current = returnedCheckoutId;
    toast.success("Payment received", {
      description: "Your credits will appear below once the payment is confirmed.",
    });
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnedCheckoutId]);

  async function handleBuy() {
    if (isSaving || !canBuy || parsed === null) return;
    setIsSaving(true);
    try {
      const { checkoutUrl, error } = await createCreditCheckout({ data: { usdAmount: formatCentsToUsd(parsed) } });
      if (!checkoutUrl || error) {
        toast.error("Checkout could not be started.", { description: error ?? undefined });
        return;
      }
      window.location.href = checkoutUrl;
    } catch (err) {
      toast.error("Checkout could not be started.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 flex min-h-20 items-center justify-between gap-6 border-b border-line bg-paper px-5 sm:px-8">
        <section>
          <p className="text-xs font-semibold text-muted">Workspace</p>
          <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em]">Credits</h1>
        </section>
        <Link to="/app" className="text-sm font-semibold text-muted transition-colors hover:text-ink">
          Back to overview
        </Link>
      </header>

      <section className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8">
        <header>
          <p className="text-sm font-medium text-blue">Usage</p>
          <h2 className="mt-2 text-4xl font-semibold tracking-[-0.07em]">Pay for what you use.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Enter any dollar amount and get the equivalent credits. ${formatCentsToDisplayUsd(100)} buys {config.creditsPerUsd}{" "}
            credits — running goals and workflows spends them down.
          </p>
        </header>

        <section className="rounded-3xl bg-ink p-6 text-white sm:p-8">
          <section className="flex flex-wrap items-start justify-between gap-4">
            <section>
              <p className="text-xs font-semibold text-blue-soft">Credit balance</p>
              <p className="mt-2 text-5xl font-semibold tracking-[-0.06em] tabular-nums" aria-live="polite">
                {isBalanceLoading ? "…" : balance.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-white/60">1 credit powers a unit of agent work</p>
            </section>
            {isBachsTestMode() ? (
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
                Test mode
              </span>
            ) : null}
          </section>
        </section>

        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="rounded-3xl border border-line bg-white p-6 sm:p-7">
            <h2 className="text-xl font-semibold tracking-[-0.04em]">Buy credits</h2>
            <p className="mt-1 text-sm text-muted">You choose the dollar amount — credits land right after payment.</p>

            <label className="mt-5 block">
              <span className="text-sm font-semibold">Amount (USD)</span>
              <section className="relative mt-2">
                <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
                  $
                </span>
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="25.00"
                  aria-label="Amount in US dollars"
                  aria-invalid={!!amountError}
                  className={`${fieldInputClass} mt-0 pl-8 tabular-nums`}
                />
              </section>
            </label>

            <section className="mt-3 flex flex-wrap gap-2" aria-label="Quick amounts">
              {QUICK_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  aria-pressed={amount === preset}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${amount === preset ? "border-blue bg-blue text-white" : "border-line bg-white text-muted hover:border-ink hover:text-ink"}`}
                >
                  ${preset}
                </button>
              ))}
            </section>

            <section className="mt-5 rounded-2xl bg-wash px-4 py-4" aria-live="polite">
              {previewCredits !== null && parsed !== null ? (
                <p className="text-sm leading-6">
                  <span className="font-bold tabular-nums">{previewCredits.toLocaleString()} credits</span>{" "}
                  <span className="text-muted">for ${formatCentsToDisplayUsd(parsed)}</span>
                </p>
              ) : (
                <p className="text-sm leading-6 text-muted">Enter an amount to see the equivalent credits.</p>
              )}
              {amountError ? (
                <p role="alert" className="mt-1 text-xs font-semibold leading-5 text-red-700">
                  {amountError}
                </p>
              ) : (
                <p className="mt-1 text-xs leading-5 text-muted">
                  ${formatCentsToDisplayUsd(config.minCents)} minimum · ${formatCentsToDisplayUsd(config.maxCents)} maximum · snaps to $0.05
                  steps so every cent maps to whole credits.
                </p>
              )}
            </section>

            <button
              type="button"
              onClick={() => void handleBuy()}
              disabled={!canBuy}
              aria-busy={isSaving}
              className="mt-5 w-full rounded-xl bg-blue px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Starting checkout…" : previewCredits !== null ? `Buy ${previewCredits.toLocaleString()} credits` : "Buy credits"}
            </button>
            <p className="mt-3 text-xs leading-5 text-muted">Secure checkout by Bachs. Credits are added once payment confirms.</p>
          </article>

          <article className="rounded-3xl border border-line bg-white p-6 sm:p-7">
            <header className="flex items-start justify-between gap-4">
              <section>
                <h2 className="text-xl font-semibold tracking-[-0.04em]">Activity</h2>
                <p className="mt-1 text-sm text-muted">Purchases and spending on this workspace.</p>
              </section>
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={isBalanceLoading}
                className="shrink-0 rounded-xl border border-line px-3 py-2 text-sm font-semibold text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-60"
              >
                Refresh
              </button>
            </header>

            {openPurchases.length > 0 ? (
              <ul className="mt-5 space-y-2">
                {openPurchases.map((purchase) => (
                  <li key={purchase.id} className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block font-semibold tabular-nums">
                        {purchase.credits.toLocaleString()} credits · ${purchase.usdAmount}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">Checkout open — completes after payment</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">Pending</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {entries.length === 0 ? (
              <p className="mt-5 rounded-2xl bg-wash px-4 py-6 text-center text-sm leading-6 text-muted">
                No credit activity yet. Your purchases will show up here.
              </p>
            ) : (
              <ul className="mt-5 divide-y divide-line border-y border-line">
                {entries.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 py-3.5 text-sm">
                    <span
                      aria-hidden="true"
                      className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${entry.amount >= 0 ? "bg-blue-pale text-blue-dark" : "bg-wash text-muted"}`}
                    >
                      {entry.amount >= 0 ? "+" : "−"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold tabular-nums">
                        {entry.amount >= 0 ? "+" : "−"}
                        {Math.abs(entry.amount).toLocaleString()} credits
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {entry.kind === "purchase" && entry.usdAmount ? `Purchased · $${entry.usdAmount} · ` : ""}
                        {formatLedgerDate(entry.createdAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      </section>
    </section>
  );
}
