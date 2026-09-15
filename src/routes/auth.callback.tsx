import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { exchangeCodeForSession } from "../lib/supabase/auth-server-fns";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const next = params.get("next");
    const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/app/";

    if (!code) {
      setError("The X sign-in could not be completed.");
      return;
    }

    exchangeCodeForSession({ data: { code } })
      .then(({ error: exchangeError }) => {
        if (exchangeError) {
          setError(exchangeError);
          return;
        }

        window.location.replace(destination);
      })
      .catch(() => {
        setError("The X sign-in could not be completed. Please try again.");
      });
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-6 text-center text-ink">
      <section className="max-w-md">
        <p className="text-sm font-medium text-blue">
          xGoal
        </p>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.06em]">
          {error ? "Sign-in needs another try" : "Finishing your sign-in"}
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          {error ?? "Securing your workspace and getting things ready."}
        </p>
        {error ? (
          <a
            href="/app/"
            className="mt-7 inline-flex min-h-11 items-center rounded-xl bg-blue px-5 py-3 text-sm font-bold text-white"
          >
            Back to sign in
          </a>
        ) : null}
      </section>
    </main>
  );
}
