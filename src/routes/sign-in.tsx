import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sign-in')({
  component: SignInPage,
})

function SignInPage() {
  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8 text-center">Sign in to XGoals</h1>
      
      <div className="rounded-lg border border-[var(--border)] p-8">
        <button className="w-full rounded-lg bg-[#1d9bf0] text-white py-3 font-semibold hover:opacity-90 transition mb-4">
          Continue with X
        </button>
        
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border)]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-[var(--background)] px-4 text-[var(--muted-foreground)]">or</span>
          </div>
        </div>
        
        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email address
            </label>
            <input
              type="email"
              id="email"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="you@example.com"
            />
          </div>
          
          <button
            type="submit"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] py-3 font-semibold hover:bg-[var(--muted)] transition"
          >
            Continue with Email
          </button>
        </form>
      </div>
      
      <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
        By signing in, you agree to our{' '}
        <a href="/terms" className="text-[var(--primary)]">Terms</a> and{' '}
        <a href="/privacy" className="text-[var(--primary)]">Privacy Policy</a>.
      </p>
    </main>
  )
}
