import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { NavIcon } from "@astryxdesign/core/NavIcon";
import { VStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";

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
                <NavIcon
                  icon={
                    <Icon
                      icon={(props: React.SVGProps<SVGSVGElement>) => (
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-hidden="true"
                          {...props}
                        >
                          <circle
                            cx="8"
                            cy="8"
                            r="6.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <circle cx="8" cy="8" r="2.5" fill="currentColor" />
                        </svg>
                      )}
                    />
                  }
                />
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
