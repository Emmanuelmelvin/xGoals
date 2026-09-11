import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-16">
      <section className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4 tracking-tight">
          Set a goal. Deploy an agent. Stay active in your niche.
        </h1>
        <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto">
          XGoals helps you maintain consistent presence on X by defining goals and letting an AI agent discover ideas, prepare drafts, and track progress.
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <a
            href="/sign-in"
            className="rounded-full bg-[var(--primary)] text-white px-6 py-3 font-semibold hover:opacity-90 transition"
          >
            Get Started
          </a>
          <a
            href="/about"
            className="rounded-full border border-[var(--border)] px-6 py-3 font-semibold hover:bg-[var(--secondary)] transition"
          >
            Learn More
          </a>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        {[
          {
            title: 'Goal-Centric Workflow',
            desc: 'Define objectives in plain English with duration and success conditions.',
          },
          {
            title: 'AI-Powered Agent',
            desc: 'Discovers relevant content, generates drafts, and suggests conversations.',
          },
          {
            title: 'Draft-First Publishing',
            desc: 'Review and approve all content before it goes to X.',
          },
        ].map(({ title, desc }) => (
          <article
            key={title}
            className="rounded-lg border border-[var(--border)] p-6 hover:bg-[var(--secondary)] transition"
          >
            <h2 className="text-lg font-semibold mb-2">{title}</h2>
            <p className="text-[var(--muted-foreground)]">{desc}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
