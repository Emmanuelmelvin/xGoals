import { createServerFn } from "@tanstack/react-start";
import { createClient } from "../supabase/server";

export type GoalAnalysis = {
  summary: string;
  permissions: Array<{
    permission: string;
    reason: string;
    decision: "review";
  }>;
  workflow_suggestions: Array<{
    name: string;
    description: string;
  }>;
};

type AnalyzeGoalInput = {
  title: string;
  prompt: string;
};

export const analyzeGoal = createServerFn({ method: "POST" })
  .validator((data: AnalyzeGoalInput) => {
    const title = data.title.trim();
    const prompt = data.prompt.trim();

    if (!title || title.length > 160) throw new Error("Goal title must be between 1 and 160 characters.");
    if (!prompt || prompt.length > 8000) throw new Error("Goal prompt must be between 1 and 8,000 characters.");

    return { title, prompt };
  })
  .handler(async ({ data }) => {
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) throw new Error("You must be signed in to analyze a goal.");

    const agentApiUrl = process.env.AGENT_API_URL ?? "http://127.0.0.1:8000";
    let response: Response;

    try {
      response = await fetch(`${agentApiUrl.replace(/\/$/, "")}/analyze-goal`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch {
      throw new Error("The local xGoal agent is unavailable. Start the agent service on port 8000.");
    }

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "The goal analysis failed.");
    }

    return (await response.json()) as GoalAnalysis;
  });
