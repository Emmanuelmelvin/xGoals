import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/workflows")({
  head: () => ({
    meta: [{ title: "xGoal — Workflows" }],
  }),
  component: WorkflowsLayout,
});

function WorkflowsLayout() {
  return <Outlet />;
}
