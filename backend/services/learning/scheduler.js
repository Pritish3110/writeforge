const MIN_EASE_FACTOR = 1.3;
const MAX_EASE_FACTOR = 3;

export const getNextInterval = (interval, easeFactor, performance) => {
  if (performance === "again") return 1;
  if (performance === "hard") return interval * 1.5;
  if (performance === "good") return interval * easeFactor;
  if (performance === "easy") return interval * easeFactor * 1.5;
  return interval;
};

export const getNextEaseFactor = (easeFactor, performance) => {
  const adjustment =
    performance === "again"
      ? -0.2
      : performance === "hard"
        ? -0.15
        : performance === "easy"
          ? 0.15
          : 0;

  return Math.min(
    MAX_EASE_FACTOR,
    Math.max(MIN_EASE_FACTOR, Number((easeFactor + adjustment).toFixed(2))),
  );
};

export const roundIntervalDays = (interval) =>
  Math.max(1, Math.round(interval));
