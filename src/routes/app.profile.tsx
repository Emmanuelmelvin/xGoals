import { createFileRoute, Link } from "@tanstack/react-router";
import { useDashboard } from "../components/dashboard-layout";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [{ title: "xGoal — Profile" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useDashboard();

  return (
    <section className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 flex min-h-20 items-center justify-between gap-6 border-b border-line bg-paper px-5 sm:px-8">
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Workspace</p>
          <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em]">Profile</h1>
        </section>
        <Link to="/app" className="text-sm font-semibold text-muted transition-colors hover:text-ink">Back to overview</Link>
      </header>

      <section className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8">
        <header>
          <p className="text-sm font-medium text-blue">Your identity</p>
          <h2 className="mt-2 text-4xl font-semibold tracking-[-0.07em]">Your profile information.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">This information comes from the X account connected to your xGoal workspace.</p>
        </header>

        <article className="overflow-hidden rounded-3xl border border-line bg-white">
          <header className="flex items-center gap-5 border-b border-line p-6 sm:p-8">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-20 rounded-2xl object-cover" /> : <span className="grid size-20 place-items-center rounded-2xl bg-blue text-2xl font-bold text-white">{user.name.slice(0, 1).toUpperCase()}</span>}
            <section className="min-w-0"><h3 className="truncate text-2xl font-semibold tracking-[-0.05em]">{user.name}</h3><p className="mt-1 text-sm text-muted">{user.handle}</p></section>
          </header>
          <dl className="divide-y divide-line">
            <ProfileField label="Display name" value={user.name} />
            <ProfileField label="X handle" value={user.handle} />
            <ProfileField label="Email" value={user.email || "Not provided by X"} />
            <section className="flex flex-col gap-2 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8"><dt className="text-sm font-medium text-muted">Profile URL</dt><dd><a href={user.profileUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue transition-colors hover:text-blue-dark">{user.profileUrl}</a></dd></section>
          </dl>
        </article>
      </section>
    </section>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return <section className="flex flex-col gap-2 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8"><dt className="text-sm font-medium text-muted">{label}</dt><dd className="truncate text-sm font-semibold text-ink sm:max-w-[65%] sm:text-right">{value}</dd></section>;
}
