import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-6">About XGoals</h1>
      
      <div className="prose prose-lg">
        <p>
          XGoals is a goal-driven AI agent that helps users maintain consistent presence on X within their niche.
        </p>
        
        <h2>How It Works</h2>
        <ol>
          <li><strong>Sign in</strong> - Connect your X account or use email</li>
          <li><strong>Create a goal</strong> - Define what you want to achieve in plain English</li>
          <li><strong>Deploy</strong> - The agent starts working toward your goal</li>
          <li><strong>Review drafts</strong> - Approve, edit, or reject content</li>
          <li><strong>Track progress</strong> - Monitor success conditions</li>
        </ol>

        <h2>Core Principles</h2>
        <ul>
          <li>User remains in control of all publishing</li>
          <li>Quality over volume</li>
          <li>Authenticity matters</li>
          <li>Goal-centric, not feature-centric</li>
        </ul>

        <h2>Tech Stack</h2>
        <ul>
          <li><strong>Frontend:</strong> TanStack Start</li>
          <li><strong>Database:</strong> Supabase PostgreSQL</li>
          <li><strong>Auth:</strong> Better Auth + Supabase Auth</li>
          <li><strong>Agent:</strong> Strands Agents SDK + AgentCore</li>
          <li><strong>LLM:</strong> Amazon Bedrock</li>
        </ul>
      </div>
    </main>
  )
}
