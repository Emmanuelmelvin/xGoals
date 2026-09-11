import { Outlet, createFileRoute } from "@tanstack/react-router";
import { DashboardRouteLayout, type DrawerState } from "../components/dashboard-layout";

export const Route = createFileRoute("/app")({
  validateSearch: (search: Record<string, unknown>): { drawer?: DrawerState } => ({
    drawer:
      search.drawer === "closed" || search.drawer === "open"
        ? search.drawer
        : undefined,
  }),
  component: AppLayout,
});

function AppLayout() {
  const { drawer } = Route.useSearch();

  return (
    <DashboardRouteLayout drawer={drawer}>
      <Outlet />
    </DashboardRouteLayout>
  );
}
