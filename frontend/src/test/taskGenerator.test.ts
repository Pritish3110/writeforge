import { describe, expect, it } from "vitest";
import {
  generateTask,
  generateTaskTitle,
  resetUsedTasks,
} from "@/lib/taskGenerator";

describe("taskGenerator", () => {
  it("creates a skill-based writing task with title and description", () => {
    resetUsedTasks();

    const result = generateTask();

    expect(result.title.length).toBeGreaterThan(0);
    expect(result.description.length).toBeGreaterThan(0);
    expect(result.focus.length).toBeGreaterThan(0);
  });

  it("returns a usable focus tag for the generated task", () => {
    resetUsedTasks();

    const result = generateTask();

    expect(result.description.toLowerCase()).toContain(result.focus);
  });

  it("builds readable task titles from the focus area", () => {
    expect(generateTaskTitle({ focus: "pacing control" })).toMatch(
      /^(Focus|Exercise|Practice|Skill Drill): Pacing Control$/,
    );
  });

  it("tracks used combinations to avoid immediate repetition", () => {
    resetUsedTasks();

    const first = generateTask();
    const second = generateTask();

    expect(first.description).not.toBe(second.description);
    expect(first.usedCount).toBeGreaterThanOrEqual(1);
  });
});
