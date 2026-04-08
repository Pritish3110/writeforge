import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const databaseDir = path.join(__dirname, "database");
const port = Number.parseInt(process.env.PORT || "8787", 10);
const writableCollections = [
  "taskRecords",
  "customTasks",
  "taskTemplates",
  "characters",
  "characterRelationships",
  "plotPoints",
  "drafts",
  "worldElements",
  "knowledgeBaseSections",
];

const collectionFiles = {
  users: "users.json",
  taskRecords: "taskRecords.json",
  customTasks: "customTasks.json",
  taskTemplates: "taskTemplates.json",
  characters: "characters.json",
  characterRelationships: "characterRelationships.json",
  plotPoints: "plotPoints.json",
  drafts: "drafts.json",
  worldElements: "worldElements.json",
  knowledgeBaseSections: "knowledgeBaseSections.json",
};

const buildCorsHeaders = (request) => ({
  "Access-Control-Allow-Origin": request.headers.origin || "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers":
    request.headers["access-control-request-headers"] ||
    "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin, Access-Control-Request-Headers",
});

const sendJson = (request, response, statusCode, payload) => {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...buildCorsHeaders(request),
  });
  response.end(JSON.stringify(payload, null, 2));
};

const readRequestBody = async (request) => {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return null;

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  if (!rawBody) return null;

  return JSON.parse(rawBody);
};

const readCollection = async (collectionName) => {
  const fileName = collectionFiles[collectionName];
  if (!fileName) return null;

  const raw = await fs.readFile(path.join(databaseDir, fileName), "utf8");
  return JSON.parse(raw);
};

const writeCollection = async (collectionName, value) => {
  const fileName = collectionFiles[collectionName];
  if (!fileName) return;

  await fs.writeFile(
    path.join(databaseDir, fileName),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
};

const buildSnapshot = async (userId) => {
  const [
    users,
    taskRecords,
    customTasks,
    taskTemplates,
    characters,
    characterRelationships,
    plotPoints,
    drafts,
    worldElements,
    knowledgeBaseSections,
  ] = await Promise.all(
    Object.keys(collectionFiles).map((collectionName) => readCollection(collectionName)),
  );

  return {
    user: users.find((user) => user.id === userId) || null,
    taskRecords: taskRecords.filter((item) => item.userId === userId),
    customTasks: customTasks.filter((item) => item.userId === userId),
    taskTemplates: taskTemplates.filter((item) => item.userId === userId),
    characters: characters.filter((item) => item.userId === userId),
    characterRelationships: characterRelationships.filter((item) => item.userId === userId),
    plotPoints: plotPoints.filter((item) => item.userId === userId),
    drafts: drafts.filter((item) => item.userId === userId),
    worldElements: worldElements.filter((item) => item.userId === userId),
    knowledgeBaseSections: knowledgeBaseSections.filter((item) => item.userId === userId),
  };
};

const persistSnapshot = async (userId, snapshot) => {
  const now = new Date().toISOString();
  const users = await readCollection("users");
  const existingUser = users.find((user) => user.id === userId) || null;
  const incomingUser =
    snapshot && typeof snapshot === "object" && snapshot.user && typeof snapshot.user === "object"
      ? snapshot.user
      : {};
  const nextUser = {
    ...(existingUser || {}),
    ...(incomingUser || {}),
    id: userId,
    updatedAt: now,
    createdAt: existingUser?.createdAt || incomingUser?.createdAt || now,
  };

  await writeCollection("users", [
    ...users.filter((user) => user.id !== userId),
    nextUser,
  ]);

  for (const collectionName of writableCollections) {
    const existingCollection = await readCollection(collectionName);
    const incomingCollection =
      snapshot &&
      typeof snapshot === "object" &&
      Array.isArray(snapshot[collectionName])
        ? snapshot[collectionName]
        : [];

    const normalizedDocuments = incomingCollection
      .filter((document) => document && typeof document === "object")
      .map((document, index) => {
        const existingDocument =
          typeof document.id === "string"
            ? existingCollection.find((item) => item.id === document.id)
            : null;

        return {
          ...(existingDocument || {}),
          ...document,
          id:
            typeof document.id === "string" && document.id.trim().length > 0
              ? document.id
              : `${collectionName}-${index + 1}`,
          userId,
          updatedAt: document.updatedAt || now,
          createdAt: existingDocument?.createdAt || document.createdAt || now,
        };
      });

    await writeCollection(collectionName, [
      ...existingCollection.filter((item) => item.userId !== userId),
      ...normalizedDocuments,
    ]);
  }

  return buildSnapshot(userId);
};

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    sendJson(request, response, 400, { error: "Missing request URL." });
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      ...buildCorsHeaders(request),
    });
    response.end();
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);
  const pathname = url.pathname;

  try {
    if (request.method === "GET" && pathname === "/health") {
      sendJson(request, response, 200, {
        ok: true,
        mode: "mock",
        port,
        collections: Object.keys(collectionFiles),
        writableCollections,
      });
      return;
    }

    if (request.method === "GET" && pathname === "/api/collections") {
      sendJson(request, response, 200, Object.keys(collectionFiles));
      return;
    }

    if (request.method === "GET" && pathname.startsWith("/api/collections/")) {
      const collectionName = pathname.replace("/api/collections/", "");
      const collection = await readCollection(collectionName);

      if (!collection) {
        sendJson(request, response, 404, { error: `Unknown collection: ${collectionName}` });
        return;
      }

      sendJson(request, response, 200, collection);
      return;
    }

    if (request.method === "GET" && pathname.startsWith("/api/snapshot/")) {
      const userId = pathname.replace("/api/snapshot/", "");
      const snapshot = await buildSnapshot(userId);
      sendJson(request, response, 200, snapshot);
      return;
    }

    if (request.method === "PUT" && pathname.startsWith("/api/snapshot/")) {
      const userId = pathname.replace("/api/snapshot/", "");
      const body = await readRequestBody(request);
      const snapshot = await persistSnapshot(userId, body || {});
      sendJson(request, response, 200, snapshot);
      return;
    }

    sendJson(request, response, 404, {
      error: "Route not found.",
      availableRoutes: [
        "GET /health",
        "GET /api/collections",
        "GET /api/collections/:name",
        "GET /api/snapshot/:userId",
        "PUT /api/snapshot/:userId",
      ],
    });
  } catch (error) {
    sendJson(request, response, 500, {
      error: "Mock backend failed.",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mock backend running at http://127.0.0.1:${port}`);
});
