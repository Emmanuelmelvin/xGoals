import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { NavIcon } from "@astryxdesign/core/NavIcon";
import { VStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import { XGoalsMark } from "../components/logo";

export const Route = createFileRoute("/app/")({
  component: AppPlaceholder,
});

function AppPlaceholder() {
  return (
    <AppShell
      height="auto"
      contentPadding={0}
      topNav={
        <TopNav
          label="App navigation"
          heading={
            <TopNavHeading
              heading="XGoals"
              logo={
                <NavIcon icon={<Icon icon={XGoalsMark} />} />
              }
            />
          }
        />
      }
    >
      <Layout
        contentWidth={640}
        content={
          <LayoutContent>
            <VStack gap={3}>
              <Heading level={1}>Your workspace is on its way</Heading>
              <Text type="supporting">
                Goals, drafts, and progress tracking will live here. Onboarding
                and X sign-in are coming next.
              </Text>
              <Button label="Back to home" variant="secondary" href="/" />
            </VStack>
          </LayoutContent>
        }
      />
    </AppShell>
  );
}
