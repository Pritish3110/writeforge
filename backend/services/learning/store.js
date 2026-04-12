import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const learningProgressPath = path.resolve(
  __dirname,
  "../../database/learningProgress.json",
);

const ensureFile = async () => {
  try {
    await fs.access(learningProgressPath);
  } catch {
    await fs.writeFile(learningProgressPath, "[]\n", "utf8");
  }
};

export const readLearningProgressStore = async () => {
  await ensureFile();
  const rawValue = await fs.readFile(learningProgressPath, "utf8");

  try {
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

export const writeLearningProgressStore = async (records) => {
  await ensureFile();
  await fs.writeFile(
    learningProgressPath,
    `${JSON.stringify(records, null, 2)}\n`,
    "utf8",
  );
};
