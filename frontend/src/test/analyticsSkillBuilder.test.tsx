import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Analytics from "@/pages/Analytics";

const learningHookMock = vi.hoisted(() => ({
  useLearningEngine: vi.fn(),
}));

const taskTrackingMock = vi.hoisted(() => ({
  useTaskTracking: vi.fn(),
}));

vi.mock("@/hooks/useLearningEngine", () => learningHookMock);
vi.mock("@/hooks/useTaskTracking", () => taskTrackingMock);

describe("Analytics Skill Builder", () => {
  beforeEach(() => {
    taskTrackingMock.useTaskTracking.mockReturnValue({
      getLast7Days: () => [
        { day: "Mon", completed: 2, total: 3 },
        { day: "Tue", completed: 1, total: 2 },
      ],
      getLast28Days: () => [
        { date: "2026-04-10", completed: 1, total: 2 },
        { date: "2026-04-11", completed: 2, total: 2 },
      ],
      getStreak: () => ({ current: 4, longest: 8 }),
      getCategoryStats: () => [{ name: "Character", value: 4 }],
    });
  });

  it("shows user-friendly skill insights instead of system metrics", () => {
    learningHookMock.useLearningEngine.mockReturnValue({
      progress: {
        totalTopics: 7,
        topicsStarted: 5,
        topicsCompleted: 3,
        dueToday: 2,
        streak: {
          current: 4,
          longest: 6,
        },
        weakTopics: [
          {
            topicId: "metaphor",
            title: "Metaphor",
            themeTitle: "Figurative Language",
            stage: "recognize",
            weaknessScore: 3,
            againCount: 1,
            hardCount: 0,
            recommendation: "Practice a few more metaphor examples to improve.",
          },
        ],
        stageBreakdown: {},
        themes: [
          {
            id: "theme-1",
            title: "Simile",
            totalTopics: 3,
            masteredTopics: 2,
            status: "in_progress",
          },
          {
            id: "theme-2",
            title: "Metaphor",
            totalTopics: 4,
            masteredTopics: 1,
            status: "in_progress",
          },
        ],
        activeTheme: {
          id: "theme-2",
          title: "Metaphor",
          totalTopics: 4,
          masteredTopics: 1,
          status: "in_progress",
        },
        heatmap: [
          { date: "2026-04-07", count: 1, level: 1 },
          { date: "2026-04-08", count: 0, level: 0 },
          { date: "2026-04-09", count: 1, level: 1 },
          { date: "2026-04-10", count: 1, level: 1 },
          { date: "2026-04-11", count: 2, level: 2 },
          { date: "2026-04-12", count: 0, level: 0 },
          { date: "2026-04-13", count: 0, level: 0 },
        ],
      },
      loadingProgress: false,
      error: null,
    });

    render(<Analytics />);

    expect(screen.getByText("Skill Builder Insights")).toBeInTheDocument();
    expect(screen.getByText("Concepts Learned")).toBeInTheDocument();
    expect(screen.getByText("Practice Streak")).toBeInTheDocument();
    expect(screen.getByText("Suggested Focus")).toBeInTheDocument();
    expect(screen.getByText(/you're close to mastering metaphor/i)).toBeInTheDocument();
    expect(screen.queryByText(/Learning Engine Analytics/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Reviews Due Today/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Weak Area Reinforcement/i)).not.toBeInTheDocument();
  });

  it("shows the friendly analytics error state", () => {
    learningHookMock.useLearningEngine.mockReturnValue({
      progress: null,
      loadingProgress: false,
      error: "Unable to load your skill insights. Please try again in a moment.",
    });

    render(<Analytics />);

    expect(
      screen.getByText("Unable to load your skill insights. Please try again in a moment."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/backend/i)).not.toBeInTheDocument();
  });
});
