import { describe, expect, it } from "vitest";
import { mergeLearningSessionSummary } from "@/lib/learningSession";
import type { LearningSessionSummary } from "@/services/learningClient";

const baseSession: LearningSessionSummary = {
  id: "session-1",
  date: "2026-04-15",
  topicId: "simile",
  steps: {
    learn: true,
    write: false,
    improve: false,
    challenge: false,
  },
  writeScore: null,
  challengeScore: null,
  finalScore: null,
  completed: false,
};

describe("mergeLearningSessionSummary", () => {
  it("preserves completed steps when a later payload arrives with stale step flags", () => {
    const merged = mergeLearningSessionSummary({
      previous: baseSession,
      incoming: {
        id: "session-1",
        date: "2026-04-15",
        topicId: "simile",
        steps: {
          learn: false,
          write: true,
          improve: false,
          challenge: false,
        },
        writeScore: 84,
      },
      preserveCompletedSteps: true,
    });

    expect(merged.steps.learn).toBe(true);
    expect(merged.steps.write).toBe(true);
    expect(merged.writeScore).toBe(84);
  });

  it("allows a different session to replace the previous one without carrying old steps forward", () => {
    const merged = mergeLearningSessionSummary({
      previous: baseSession,
      incoming: {
        id: "session-2",
        date: "2026-04-16",
        topicId: "metaphor",
        steps: {
          learn: false,
          write: false,
          improve: false,
          challenge: false,
        },
      },
      defaultDate: "2026-04-16",
      defaultTopicId: "metaphor",
      preserveCompletedSteps: true,
    });

    expect(merged.topicId).toBe("metaphor");
    expect(merged.date).toBe("2026-04-16");
    expect(merged.steps.learn).toBe(false);
  });

  it("marks the session complete when the challenge step is finished", () => {
    const merged = mergeLearningSessionSummary({
      previous: baseSession,
      overrides: {
        steps: {
          challenge: true,
        },
      },
      preserveCompletedSteps: true,
    });

    expect(merged.steps.learn).toBe(true);
    expect(merged.steps.challenge).toBe(true);
    expect(merged.completed).toBe(true);
  });
});

