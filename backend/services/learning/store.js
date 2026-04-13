import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const learningProgressPath = path.resolve(
  __dirname,
  "../../database/learningProgress.json",
);
const skillBuilderEntriesPath = path.resolve(
  __dirname,
  "../../database/skillBuilderEntries.json",
);
const learningSessionsPath = path.resolve(
  __dirname,
  "../../database/learningSessions.json",
);

const ensureFile = async (filePath) => {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, "[]\n", "utf8");
  }
};

const readJsonArrayStore = async (filePath) => {
  await ensureFile(filePath);
  const rawValue = await fs.readFile(filePath, "utf8");

  try {
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

const writeJsonArrayStore = async (filePath, records) => {
  await ensureFile(filePath);
  await fs.writeFile(
    filePath,
    `${JSON.stringify(records, null, 2)}\n`,
    "utf8",
  );
};

export const readLearningProgressStore = async () =>
  readJsonArrayStore(learningProgressPath);

export const writeLearningProgressStore = async (records) =>
  writeJsonArrayStore(learningProgressPath, records);

export const readSkillBuilderEntriesStore = async () =>
  readJsonArrayStore(skillBuilderEntriesPath);

export const writeSkillBuilderEntriesStore = async (records) =>
  writeJsonArrayStore(skillBuilderEntriesPath, records);

export const readLearningSessionsStore = async () =>
  readJsonArrayStore(learningSessionsPath);

export const writeLearningSessionsStore = async (records) =>
  writeJsonArrayStore(learningSessionsPath, records);
