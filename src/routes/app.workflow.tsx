import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/workflow")({
  component: WorkflowLayout,
});

function WorkflowLayout() {
  return <Outlet />;
}
