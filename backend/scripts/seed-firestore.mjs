import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const databaseDir = path.resolve(__dirname, "../database");

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const projectId = process.env.FIREBASE_PROJECT_ID || "writerz-local";
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (emulatorHost) {
  initializeApp({ projectId });
  console.log(`Using Firestore emulator at ${emulatorHost}`);
} else {
  if (!serviceAccountPath) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_PATH. Set FIRESTORE_EMULATOR_HOST for local seeding or FIREBASE_SERVICE_ACCOUNT_PATH for remote seeding.",
    );
  }

  const serviceAccount = JSON.parse(
    await fs.readFile(path.resolve(serviceAccountPath), "utf8"),
  );

  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

const readCollectionFile = async (fileName) =>
  JSON.parse(await fs.readFile(path.join(databaseDir, fileName), "utf8"));

const writeRootUsers = async () => {
  const users = await readCollectionFile("users.json");

  await Promise.all(
    users.map(async (user) => {
      await db.collection("users").doc(user.id).set(user, { merge: true });
    }),
  );
};

const writeUserSubcollection = async (fileName, subcollectionName) => {
  const documents = await readCollectionFile(fileName);

  await Promise.all(
    documents.map(async (document) => {
      if (!document.userId) {
        throw new Error(`${fileName} contains a document without userId`);
      }

      await db
        .collection("users")
        .doc(document.userId)
        .collection(subcollectionName)
        .doc(document.id)
        .set(document, { merge: true });
    }),
  );
};

const main = async () => {
  await writeRootUsers();

  await writeUserSubcollection("taskRecords.json", "taskRecords");
  await writeUserSubcollection("customTasks.json", "customTasks");
  await writeUserSubcollection("taskTemplates.json", "taskTemplates");
  await writeUserSubcollection("characters.json", "characters");
  await writeUserSubcollection(
    "characterRelationships.json",
    "characterRelationships",
  );
  await writeUserSubcollection("plotPoints.json", "plotPoints");
  await writeUserSubcollection("drafts.json", "drafts");
  await writeUserSubcollection("worldElements.json", "worldElements");
  await writeUserSubcollection(
    "knowledgeBaseSections.json",
    "knowledgeBaseSections",
  );

  console.log("Firestore seed completed.");
};

await main();
