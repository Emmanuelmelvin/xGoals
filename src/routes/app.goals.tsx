import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/goals")({
  head: () => ({
    meta: [{ title: "xGoal — Goals" }],
  }),
  component: GoalsLayout,
});

function GoalsLayout() {
  return <Outlet />;
}
