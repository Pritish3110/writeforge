const STAGE_ORDER = ["learn", "recognize", "apply", "mastered"];

const shuffle = (values) => {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
};

const buildRecognizeStage = (topic, curriculum) => {
  const distractors = curriculum
    .filter((candidate) => candidate.id !== topic.id)
    .sort((left, right) => left.order - right.order)
    .slice(0, 3)
    .map((candidate) => ({
      id: candidate.id,
      label: candidate.title,
    }));

  const options = shuffle([
    {
      id: topic.id,
      label: topic.title,
    },
    ...distractors,
  ]);

  return {
    type: "mcq",
    stage: "recognize",
    question: `Which figure of speech matches this definition: "${topic.definition}"?`,
    options,
    answerId: topic.id,
  };
};

const buildApplyStage = (topic) => ({
  type: "write",
  stage: "apply",
  prompt: `Write 2-3 original sentences that clearly use ${topic.title}.`,
  guidance:
    topic.examples.length > 0
      ? `Anchor yourself with the pattern from examples like: ${topic.examples[0]}. Add enough context for the image to feel vivid.`
      : `Focus on showing the effect of ${topic.title} in context across 2-3 connected sentences.`,
});

export const createStagePayload = ({ topic, stage, curriculum }) => {
  if (stage === "learn") {
    return {
      type: "learn",
      stage,
      data: topic,
    };
  }

  if (stage === "recognize") {
    return buildRecognizeStage(topic, curriculum);
  }

  return buildApplyStage(topic);
};

export const getNextStage = (currentStage, performance) => {
  if (performance === "again") {
    return "learn";
  }

  if (performance === "hard") {
    return currentStage;
  }

  const currentIndex = Math.max(STAGE_ORDER.indexOf(currentStage), 0);
  return STAGE_ORDER[Math.min(currentIndex + 1, STAGE_ORDER.length - 1)];
};
