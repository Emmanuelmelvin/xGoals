import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { NavIcon } from "@astryxdesign/core/NavIcon";
import { Section } from "@astryxdesign/core/Section";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TopNav, TopNavHeading, TopNavItem } from "@astryxdesign/core/TopNav";
import { XGoalsMark } from "../components/logo";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const FEATURES = [
  {
    title: "Goal-driven, not feed-driven",
    body: "Describe the outcome you want in plain English — the agent decides which drafts, replies, and conversations best serve that goal.",
  },
  {
    title: "Drafts before publishing",
    body: "Every post starts as a draft with the agent's reasoning attached. Edit, regenerate, approve — nothing reaches X without you.",
  },
  {
    title: "Progress you can see",
    body: "Success conditions are tracked against real outcomes: published posts, conversations started, consistency kept.",
  },
];

const STEPS = [
  {
    title: "Sign in with X",
    body: "Your X account is your identity. Connect once; tokens stay encrypted server-side.",
  },
  {
    title: "Create a goal",
    body: "Write what you want in plain English, set a duration, and define what success means.",
  },
  {
    title: "Deploy the agent",
    body: "The agent discovers ideas, drafts posts, and suggests conversations while you stay in control.",
  },
  {
    title: "Review and publish",
    body: "Approve drafts in your dashboard and publish to X when you're ready.",
  },
];

function LandingPage() {
  return (
    <AppShell
      height="auto"
      contentPadding={0}
      topNav={
        <TopNav
          label="Main navigation"
          heading={
            <TopNavHeading
              heading="XGoals"
              logo={
                <NavIcon icon={<Icon icon={XGoalsMark} />} />
              }
            />
          }
          startContent={
            <>
              <TopNavItem label="Features" href="#features" />
              <TopNavItem label="How it works" href="#how-it-works" />
            </>
          }
          endContent={
            <HStack gap={2}>
              <Button label="Sign in" variant="ghost" href="/app" />
              <Button label="Get started" variant="primary" href="/app" />
            </HStack>
          }
        />
      }
    >
      <Layout
        contentWidth={960}
        content={
          <LayoutContent>
            <VStack gap={6}>
              <VStack gap={3}>
                <Heading level={1}>
                  Set a goal. Deploy an agent. Stay active in your niche.
                </Heading>
                <Text type="supporting">
                  XGoals is a goal-driven AI content workspace for X. You
                  define the outcome — the agent prepares drafts, finds
                  conversations worth joining, and tracks progress. You
                  approve everything before it goes out.
                </Text>
                <HStack gap={2}>
                  <Button
                    label="Start building your presence"
                    variant="primary"
                    size="lg"
                    href="/app"
                  />
                  <Button
                    label="How it works"
                    variant="secondary"
                    size="lg"
                    href="#how-it-works"
                  />
                </HStack>
              </VStack>

              <Section>
                <VStack gap={3}>
                  <Heading level={2}>Why XGoals</Heading>
                  <Grid columns={{ minWidth: 260 }} gap={3}>
                    {FEATURES.map((feature) => (
                      <Card key={feature.title}>
                        <VStack gap={2}>
                          <Heading level={3}>{feature.title}</Heading>
                          <Text>{feature.body}</Text>
                        </VStack>
                      </Card>
                    ))}
                  </Grid>
                </VStack>
              </Section>

              <Section>
                <VStack gap={3}>
                  <Heading level={2}>How it works</Heading>
                  <Grid columns={{ minWidth: 200 }} gap={3}>
                    {STEPS.map((step, index) => (
                      <Card key={step.title}>
                        <VStack gap={2}>
                          <Text weight="semibold" color="secondary">
                            Step {index + 1}
                          </Text>
                          <Heading level={3}>{step.title}</Heading>
                          <Text>{step.body}</Text>
                        </VStack>
                      </Card>
                    ))}
                  </Grid>
                </VStack>
              </Section>

              <Section variant="muted">
                <VStack gap={3}>
                  <Heading level={2}>Stay consistent without the grind</Heading>
                  <Text>
                    Define your first 30-day goal and let the agent do the
                    heavy lifting — discovery, drafting, tracking — while you
                    keep final say on every post.
                  </Text>
                  <HStack gap={2}>
                    <Button
                      label="Create your first goal"
                      variant="primary"
                      size="lg"
                      href="/app"
                    />
                  </HStack>
                </VStack>
              </Section>
            </VStack>
          </LayoutContent>
        }
      />
    </AppShell>
  );
}
