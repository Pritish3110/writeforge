import { describe, expect, it } from "vitest";
import {
  getCategoryStats,
  getCompletionHistory,
  getCurrentWeekSummary,
  getDayCompletionSummary,
  getStreakInfo,
  getWeekKey,
  isTaskCompletedForDate,
  syncTaskRecords,
  type TaskRecord,
} from "@/lib/taskTracking";

const localDate = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 12, 0, 0, 0);

describe("taskTracking", () => {
  it("treats Monday as the start of the week and Sunday as the end", () => {
    expect(getWeekKey(localDate(2026, 4, 6))).toBe("2026-04-06");
    expect(getWeekKey(localDate(2026, 4, 12))).toBe("2026-04-06");
    expect(getWeekKey(localDate(2026, 4, 5))).toBe("2026-03-30");
  });

  it("migrates legacy date records into week-based completion that resets on Monday", () => {
    const records = syncTaskRecords([
      { taskId: "mon-1", date: "2026-04-06", completed: true },
    ]);

    expect(records).toEqual([
      { taskId: "mon-1", weekKey: "2026-04-06", completed: true, completedOn: "2026-04-06" },
    ]);
    expect(isTaskCompletedForDate(records, "mon-1", localDate(2026, 4, 6))).toBe(true);
    expect(isTaskCompletedForDate(records, "mon-1", localDate(2026, 4, 12))).toBe(true);
    expect(isTaskCompletedForDate(records, "mon-1", localDate(2026, 4, 13))).toBe(false);
  });

  it("shows the right completion state across the full Monday-Sunday schedule", () => {
    const records: TaskRecord[] = [
      { taskId: "mon-1", weekKey: "2026-04-06", completed: true, completedOn: "2026-04-06" },
      { taskId: "tue-2", weekKey: "2026-04-06", completed: true, completedOn: "2026-04-10" },
      { taskId: "sun-1", weekKey: "2026-04-06", completed: true, completedOn: "2026-04-12" },
    ];

    const week = getCurrentWeekSummary(records, [], localDate(2026, 4, 10));
    const byDay = Object.fromEntries(week.map((day) => [day.day, day.completed]));

    expect(week).toHaveLength(7);
    expect(byDay.Monday).toBe(1);
    expect(byDay.Tuesday).toBe(1);
    expect(byDay.Wednesday).toBe(0);
    expect(byDay.Sunday).toBe(1);
  });

  it("keeps weekly checkmarks while only counting same-day completions toward streak activity", () => {
    const records: TaskRecord[] = [
      { taskId: "mon-1", weekKey: "2026-04-06", completed: true, completedOn: "2026-04-06" },
      { taskId: "mon-2", weekKey: "2026-04-06", completed: true, completedOn: "2026-04-06" },
      { taskId: "tue-1", weekKey: "2026-04-06", completed: true, completedOn: "2026-04-07" },
      { taskId: "tue-2", weekKey: "2026-04-06", completed: true, completedOn: "2026-04-10" },
      { taskId: "wed-1", weekKey: "2026-04-06", completed: true, completedOn: "2026-04-08" },
    ];

    const scheduledTuesday = getDayCompletionSummary(records, [], localDate(2026, 4, 7));
    const history = getCompletionHistory(records, [], 7, localDate(2026, 4, 12));
    const historyByDate = Object.fromEntries(history.map((day) => [day.date, day]));
    const streakOnWednesday = getStreakInfo(records, [], 365, localDate(2026, 4, 8));
    const streakOnFriday = getStreakInfo(records, [], 365, localDate(2026, 4, 10));
    const totalCategoryCompletions = getCategoryStats(records, []).reduce(
      (sum, entry) => sum + entry.value,
      0,
    );

    expect(scheduledTuesday).toMatchObject({ day: "Tue", completed: 2, total: 3 });
    expect(historyByDate["2026-04-06"]).toMatchObject({ day: "Mon", completed: 2, total: 3 });
    expect(historyByDate["2026-04-07"]).toMatchObject({ day: "Tue", completed: 1, total: 3 });
    expect(historyByDate["2026-04-08"]).toMatchObject({ day: "Wed", completed: 1, total: 3 });
    expect(historyByDate["2026-04-10"]).toMatchObject({ day: "Fri", completed: 0, total: 3 });
    expect(streakOnWednesday).toEqual({ current: 3, longest: 3 });
    expect(streakOnFriday).toEqual({ current: 0, longest: 3 });
    expect(totalCategoryCompletions).toBe(5);
  });

  it("keeps migrated week-only records checked without fabricating streak activity", () => {
    const records = syncTaskRecords([
      { taskId: "tue-1", weekKey: "2026-04-06", completed: true },
    ]);

    const scheduledTuesday = getDayCompletionSummary(records, [], localDate(2026, 4, 7));
    const history = getCompletionHistory(records, [], 7, localDate(2026, 4, 12));

    expect(records).toEqual([
      { taskId: "tue-1", weekKey: "2026-04-06", completed: true, completedOn: null },
    ]);
    expect(scheduledTuesday).toMatchObject({ completed: 1, total: 3 });
    expect(history.find((day) => day.date === "2026-04-07")).toMatchObject({ completed: 0, total: 3 });
  });
});
