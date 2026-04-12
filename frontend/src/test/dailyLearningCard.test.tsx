import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DailyLearningCard from "@/components/DailyLearningCard";

const learningHookMock = vi.hoisted(() => ({
  useLearningEngine: vi.fn(),
}));

vi.mock("@/hooks/useLearningEngine", () => learningHookMock);

const baseLearningState = {
  today: null,
  progress: {
    totalTopics: 7,
    topicsStarted: 3,
    topicsCompleted: 2,
    dueToday: 1,
    streak: {
      current: 3,
      longest: 4,
    },
    weakTopics: [],
    stageBreakdown: {},
    themes: [],
    activeTheme: null,
    heatmap: [],
  },
  error: null,
  loadingToday: false,
  loadingProgress: false,
  submittingTopicId: null,
  refreshToday: vi.fn(),
  refreshProgress: vi.fn(),
  submitPerformance: vi.fn(),
};

describe("DailyLearningCard", () => {
  beforeEach(() => {
    learningHookMock.useLearningEngine.mockReset();
  });

  it("shows friendly empty-state copy", () => {
    learningHookMock.useLearningEngine.mockReturnValue(baseLearningState);

    render(<DailyLearningCard />);

    expect(screen.getByText("Skill Builder")).toBeInTheDocument();
    expect(screen.getByText("You're all caught up for today")).toBeInTheDocument();
    expect(
      screen.getByText("Come back tomorrow to continue building your skills."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/queue/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/backend/i)).not.toBeInTheDocument();
  });

  it("shows the polished dashboard summary when practice is available", () => {
    learningHookMock.useLearningEngine.mockReturnValue({
      ...baseLearningState,
      today: {
        theme: {
          id: "theme-1",
          title: "Figurative Language",
          totalTopics: 7,
          masteredTopics: 2,
          status: "in_progress",
        },
        new: {
          topicId: "metaphor",
          title: "Metaphor Practice",
          themeTitle: "Figurative Language",
          stage: "learn",
          payload: {
            type: "learn",
            stage: "learn",
            data: {
              id: "metaphor",
              order: 0,
              title: "Metaphor Practice",
              definition: "A metaphor compares one thing to another directly.",
              examples: ["The city was a furnace."],
              themeId: "theme-1",
              themeTitle: "Figurative Language",
            },
          },
        },
        reviews: [],
        application: null,
      },
    });

    render(<DailyLearningCard />);

    expect(screen.getByText("Today's Focus")).toBeInTheDocument();
    expect(screen.getByText("Quick Task")).toBeInTheDocument();
    expect(screen.getAllByText("Metaphor Practice").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /start practice/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/one short session is enough/i)).toBeInTheDocument();
    expect(screen.queryByText(/learning engine/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/due today/i)).not.toBeInTheDocument();
  });

  it("masks technical errors with user-friendly copy", () => {
    learningHookMock.useLearningEngine.mockReturnValue({
      ...baseLearningState,
      error: "Unable to load today's practice. Please try again in a moment.",
    });

    render(<DailyLearningCard />);

    expect(
      screen.getByText("Unable to load today's practice. Please try again in a moment."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/fetch resource/i)).not.toBeInTheDocument();
  });
});
