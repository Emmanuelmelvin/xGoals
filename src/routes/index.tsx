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
    number: "01",
    title: "Set the outcome",
    body: "Describe the presence you want to build, the people you want to reach, and what success looks like.",
  },
  {
    number: "02",
    title: "Deploy the agent",
    body: "The agent turns your goal into a focused plan and looks for the next useful opportunity.",
  },
  {
    number: "03",
    title: "Review what matters",
    body: "Edit and approve thoughtful drafts, then track real progress toward your goal over time.",
  },
];

const FEATURES = [
  {
    title: "Goal-first by design",
    body: "Your objective stays at the center. The agent chooses between an insight, a reply, or a conversation based on what helps most.",
  },
  {
    title: "Drafts before publishing",
    body: "Every post starts in your workspace. Nothing reaches X until you have reviewed and approved it.",
  },
  {
    title: "Progress you can trust",
    body: "See published posts, conversations, and remaining work in one calm view instead of chasing vanity metrics.",
  },
];

function LandingPage() {
  return (
    <AppShell
      height="auto"
      contentPadding={0}
      variant="elevated"
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
              <TopNavItem label="Product" href="#features" />
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
        <Section variant="transparent" padding={8}>
          <Layout
            contentWidth={960}
            content={
              <LayoutContent>
                <Grid
                  columns={{ minWidth: 300, max: 2 }}
                  gap={8}
                  align="center"
                >
                  <VStack gap={5}>
                    <HStack gap={2} align="center">
                      <Badge variant="blue" label="Early access" />
                      <Text type="supporting">A calmer way to show up</Text>
                    </HStack>
                    <VStack gap={3}>
                      <Heading level={1}>
                        Stay visible in your niche.
                        <br />
                        Skip the daily scramble.
                      </Heading>
                      <Text type="supporting" size="lg">
                        Give an AI agent a goal for your presence on X. It finds
                        useful ideas, prepares drafts, and keeps you moving—while
                        you keep the final say.
                      </Text>
                    </VStack>
                    <HStack gap={3} wrap="wrap">
                      <Button
                        label="Start a goal"
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
                    <Text type="supporting">
                      Draft-first by default · No autonomous posting
                    </Text>
                  </VStack>

                  <Card elevation="high" padding={4}>
                    <VStack gap={4}>
                      <HStack justify="between" align="center">
                        <VStack gap={0.5}>
                          <Text type="supporting">Active goal</Text>
                          <Text weight="semibold">AI agents on X</Text>
                        </VStack>
                        <Badge variant="success" label="Running" />
                      </HStack>

                      <VStack gap={2}>
                        <Heading level={3}>Build a useful presence</Heading>
                        <Text color="secondary">
                          30 days · 3 posts per week · 5 conversations
                        </Text>
                      </VStack>

                      <ProgressBar
                        label="Goal progress"
                        value={67}
                        max={100}
                        hasValueLabel
                        variant="accent"
                      />

                      <HStack justify="between" align="center">
                        <VStack gap={0.5}>
                          <Text weight="bold" size="lg">
                            8 / 12
                          </Text>
                          <Text type="supporting">posts published</Text>
                        </VStack>
                        <VStack gap={0.5}>
                          <Text weight="bold" size="lg">
                            3 / 5
                          </Text>
                          <Text type="supporting">conversations</Text>
                        </VStack>
                      </HStack>

                      <Section variant="muted" padding={3}>
                        <VStack gap={2}>
                          <HStack justify="between" align="center">
                            <Text weight="semibold">Draft ready for review</Text>
                            <Badge variant="blue" label="New" />
                          </HStack>
                          <Text>
                            “Reliable agents are less about clever prompts and
                            more about visible failure modes…”
                          </Text>
                          <Text type="supporting">
                            Suggested because it connects to your recent work.
                          </Text>
                        </VStack>
                      </Section>
                    </VStack>
                  </Card>
                </Grid>
              </LayoutContent>
            }
          />
        </Section>

        <Section
          variant="muted"
          paddingBlock={4}
          paddingInline={8}
          dividers={["top", "bottom"]}
        >
          <Layout
            contentWidth={960}
            content={
              <LayoutContent>
                <Grid columns={{ minWidth: 180, max: 3 }} gap={5}>
                  <VStack gap={1}>
                    <Text weight="bold" size="lg">
                      01
                    </Text>
                    <Text color="secondary">Plain-English goals</Text>
                  </VStack>
                  <VStack gap={1}>
                    <Text weight="bold" size="lg">
                      100%
                    </Text>
                    <Text color="secondary">User-approved publishing</Text>
                  </VStack>
                  <VStack gap={1}>
                    <Text weight="bold" size="lg">
                      01
                    </Text>
                    <Text color="secondary">Workspace for the work</Text>
                  </VStack>
                </Grid>
              </LayoutContent>
            }
          />
        </Section>

        <Section id="how-it-works" padding={8}>
          <Layout
            contentWidth={960}
            content={
              <LayoutContent>
                <VStack gap={5}>
                  <VStack gap={2}>
                    <Text color="accent" weight="semibold">
                      HOW IT WORKS
                    </Text>
                    <Heading level={2}>A goal, then the next useful move.</Heading>
                    <Text color="secondary">
                      XGoals turns a vague intention into a focused rhythm you
                      can see and shape.
                    </Text>
                  </VStack>
                  <Grid columns={{ minWidth: 220, max: 3 }} gap={3}>
                    {STEPS.map((step) => (
                      <Card key={step.number} padding={4}>
                        <VStack gap={3}>
                          <Text color="accent" weight="bold">
                            {step.number}
                          </Text>
                          <Heading level={3}>{step.title}</Heading>
                          <Text color="secondary">{step.body}</Text>
                        </VStack>
                      </Card>
                    ))}
                  </Grid>
                </VStack>
              </LayoutContent>
            }
          />
        </Section>

        <Section id="features" variant="muted" padding={8}>
          <Layout
            contentWidth={960}
            content={
              <LayoutContent>
                <VStack gap={5}>
                  <VStack gap={2}>
                    <Text color="accent" weight="semibold">
                      THE WORKSPACE
                    </Text>
                    <Heading level={2}>Built around your intent.</Heading>
                  </VStack>
                  <Grid columns={{ minWidth: 220, max: 3 }} gap={6}>
                    {FEATURES.map((feature) => (
                      <VStack key={feature.title} gap={2}>
                        <Heading level={3}>{feature.title}</Heading>
                        <Text color="secondary">{feature.body}</Text>
                      </VStack>
                    ))}
                  </Grid>
                </VStack>
              </LayoutContent>
            }
          />
        </Section>

        <Section padding={10}>
          <Layout
            contentWidth={640}
            content={
              <LayoutContent>
                <VStack gap={4} align="center">
                  <Badge variant="blue" label="Your next 30 days" />
                  <Heading level={2}>Make consistency feel lighter.</Heading>
                  <Text color="secondary">
                    Start with an outcome. Let the agent help with the follow-through.
                  </Text>
                  <Button
                    label="Create your first goal"
                    variant="primary"
                    size="lg"
                    href="/app"
                  />
                </VStack>
              </LayoutContent>
            }
          />
        </Section>
      </VStack>
    </AppShell>
  );
}
