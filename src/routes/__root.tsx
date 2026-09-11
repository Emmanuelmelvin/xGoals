import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import "../styles.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: "XGoals — Set a goal. Deploy an agent. Stay active." },
      {
        name: "description",
        content:
          "A goal-driven AI agent that helps you stay consistently active on X within your niche.",
      },
    ],
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
        <Theme theme={neutralTheme}>
          <Outlet />
        </Theme>
        <Scripts />
      </body>
    </html>
  );
}
