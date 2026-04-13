import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const curriculumDir = path.resolve(__dirname, "../../data/curriculum");

const toTitleCase = (value) =>
  value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const readCurriculumFile = async (filename) => {
  const rawValue = await fs.readFile(path.join(curriculumDir, filename), "utf8");
  const parsedValue = JSON.parse(rawValue);
  const themeId = filename.replace(/\.json$/i, "");
  const themeTitle = toTitleCase(themeId);

  return Array.isArray(parsedValue)
    ? parsedValue.map((topic, index) => ({
        id: String(topic.id || `${themeId}-${index + 1}`),
        order:
          typeof topic.order === "number" && Number.isFinite(topic.order)
            ? topic.order
            : index + 1,
        title: String(topic.title || `Topic ${index + 1}`),
        definition: String(topic.definition || ""),
        examples: Array.isArray(topic.examples)
          ? topic.examples.map((example) => String(example))
          : [],
        conceptGuide: {
          what: String(topic.conceptGuide?.what || topic.definition || ""),
          why: String(
            topic.conceptGuide?.why ||
              `Use ${String(topic.title || `topic ${index + 1}`).toLowerCase()} to make your writing more expressive.`,
          ),
          steps: Array.isArray(topic.conceptGuide?.steps)
            ? topic.conceptGuide.steps.map((step) => String(step))
            : [],
          examples: Array.isArray(topic.conceptGuide?.examples)
            ? topic.conceptGuide.examples.map((example) => String(example))
            : Array.isArray(topic.examples)
              ? topic.examples.map((example) => String(example))
              : [],
        },
        themeId,
        themeTitle,
      }))
    : [];
};

export const readCurriculum = async () => {
  const filenames = await fs.readdir(curriculumDir);
  const topicGroups = await Promise.all(
    filenames
      .filter((filename) => filename.endsWith(".json"))
      .sort((left, right) => left.localeCompare(right))
      .map(readCurriculumFile),
  );

  return topicGroups.flat().sort(
    (left, right) =>
      left.themeTitle.localeCompare(right.themeTitle) || left.order - right.order,
  );
};
