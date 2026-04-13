export * from "@/data/promptEngine";

export const buildSkillBuilderImprovementPrompt = ({
  topicTitle,
  content,
}: {
  topicTitle: string;
  content: string;
}) => `
You are a writing coach.
Improve the student's writing by making it more vivid, descriptive, and natural.
Keep the original meaning.
Preserve the use of ${topicTitle}.
Return only the improved writing in 2-3 sentences.

Student writing:
${content.trim()}
`.trim();
