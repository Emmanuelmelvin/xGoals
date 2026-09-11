import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { NavIcon } from "@astryxdesign/core/NavIcon";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Section } from "@astryxdesign/core/Section";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TopNav, TopNavHeading, TopNavItem } from "@astryxdesign/core/TopNav";
import { XGoalsMark } from "../components/logo";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const STEPS = [
  {
    number: "1",
    title: "Connect X",
    body: "Sign in with your X account. Your identity and tokens stay encrypted.",
  },
  {
    number: "2",
    title: "Define your goal",
    body: "Write what you want in plain English. Set a duration and what success means to you.",
  },
  {
    number: "3",
    title: "Agent discovers & drafts",
    body: "The agent finds conversations, generates drafts, and tracks progress against your goal.",
  },
  {
    number: "4",
    title: "You approve & publish",
    body: "Review drafts in your dashboard. Edit, approve, and publish when you're ready.",
  },
];

const METRICS = [
  { label: "Active goals", value: "128" },
  { label: "Posts published", value: "2.4k" },
  { label: "Conversations started", value: "340" },
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
              logo={<NavIcon icon={<Icon icon={XGoalsMark} />} />}
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
      <VStack gap={0}>
        <Section padding={8}>
          <Layout
            contentWidth={960}
            content={
              <LayoutContent>
                <VStack gap={6}>
                  <VStack gap={4}>
                    <Heading level={1}>
                      Your presence on X, without the grind
                    </Heading>
                    <Text type="supporting" size="lg">
                      Set a 30-day goal, deploy an AI agent, and stay visible in
                      your niche. You handle approval; the agent handles
                      discovery, drafting, and tracking.
                    </Text>
                    <HStack gap={3}>
                      <Button
                        label="Start your first goal"
                        variant="primary"
                        size="lg"
                        href="/app"
                      />
                      <Button
                        label="See how it works"
                        variant="secondary"
                        size="lg"
                        href="#how-it-works"
                      />
                    </HStack>
                  </VStack>

                  <HStack gap={4} align="center">
                    <HStack gap={2}>
                      {METRICS.map((metric) => (
                        <VStack key={metric.label} gap={0}>
                          <Text weight="bold" size="lg">
                            {metric.value}
                          </Text>
                          <Text color="secondary" size="sm">
                            {metric.label}
                          </Text>
                        </VStack>
                      ))}
                    </HStack>
                    <Badge variant="blue" label="New users this week" />
                  </HStack>

                  <Card variant="muted" padding={3}>
                    <VStack gap={2}>
                      <HStack gap={2} align="center">
                        <Text weight="semibold">Sample goal progress</Text>
                        <Badge label="67% complete" />
                      </HStack>
                      <ProgressBar label="Goal progress" value={67} max={100} isLabelHidden />
                      <Text type="supporting" size="sm">
                        8 of 12 posts published • 3 of 5 conversations started
                      </Text>
                    </VStack>
                  </Card>
                </VStack>
              </LayoutContent>
            }
          />
        </Section>

        <Section id="how-it-works" padding={6}>
          <Layout
            contentWidth={960}
            content={
              <LayoutContent>
                <VStack gap={4}>
                  <VStack gap={2}>
                    <Heading level={2}>How it works</Heading>
                    <Text color="secondary">
                      Four steps from sign-in to published posts.
                    </Text>
                  </VStack>
                  <Grid columns={{ minWidth: 220 }} gap={3}>
                    {STEPS.map((step) => (
                      <Card key={step.number}>
                        <VStack gap={2}>
                          <Text weight="semibold" color="accent">
                            Step {step.number}
                          </Text>
                          <Heading level={3}>{step.title}</Heading>
                          <Text>{step.body}</Text>
                        </VStack>
                      </Card>
                    ))}
                  </Grid>
                </VStack>
              </LayoutContent>
            }
          />
        </Section>

        <Section id="features" variant="muted" padding={6}>
          <Layout
            contentWidth={960}
            content={
              <LayoutContent>
                <VStack gap={4}>
                  <VStack gap={2}>
                    <Heading level={2}>Built for consistency</Heading>
                    <Text color="secondary">
                      Everything revolves around your goal, not your feed.
                    </Text>
                  </VStack>
                  <Grid columns={{ minWidth: 260 }} gap={3}>
                    <Card>
                      <VStack gap={2}>
                        <Heading level={3}>Goal-first design</Heading>
                        <Text>
                          Define outcomes in plain English. The agent decides
                          which actions help you get there.
                        </Text>
                      </VStack>
                    </Card>
                    <Card>
                      <VStack gap={2}>
                        <Heading level={3}>Drafts, not automation</Heading>
                        <Text>
                          Every post is a draft until you approve. Edit,
                          regenerate, or reject.
                        </Text>
                      </VStack>
                    </Card>
                    <Card>
                      <VStack gap={2}>
                        <Heading level={3}>Visible progress</Heading>
                        <Text>
                          Track published posts, conversations started, and
                          consistency metrics in one dashboard.
                        </Text>
                      </VStack>
                    </Card>
                  </Grid>
                </VStack>
              </LayoutContent>
            }
          />
        </Section>

        <Section padding={8}>
          <Layout
            contentWidth={640}
            content={
              <LayoutContent>
                <VStack gap={4} align="center">
                  <Heading level={2}>
                    Start your first 30-day goal
                  </Heading>
                  <Text color="secondary">
                    Stay present in your niche. Approve every post. Track what
                    matters.
                  </Text>
                  <HStack gap={3}>
                    <Button
                      label="Get started"
                      variant="primary"
                      size="lg"
                      href="/app"
                    />
                    <Button
                      label="Sign in"
                      variant="ghost"
                      size="lg"
                      href="/app"
                    />
                  </HStack>
                </VStack>
              </LayoutContent>
            }
          />
        </Section>
      </VStack>
    </AppShell>
  );
}
