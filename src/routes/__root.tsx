import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import "../styles.css";
import { ToastProvider } from "../components/toast";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: "xGoal — A clearer way to show up on X." },
      {
        name: "description",
        content:
          "A goal-driven AI agent that helps you stay consistently active on X within your niche.",
      },
    ],
    links: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ToastProvider>
          <Outlet />
        </ToastProvider>
        <Scripts />
      </body>
    </html>
  );
}
