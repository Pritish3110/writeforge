import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { aiRoutes } from "./routes/aiRoutes.js";
import { learningRoutes } from "./routes/learningRoutes.js";

const app = express();
const PORT = Number.parseInt(process.env.PORT || "5000", 10);
const DEFAULT_FRONTEND_ORIGINS = ["http://localhost:5173", "http://localhost:8080", "http://127.0.0.1:5173", "http://127.0.0.1:8080", "https://writer-z.vercel.app", "https://writerz.vercel.app"];
const allowedOrigins = Array.from(
  new Set(
    [
      ...DEFAULT_FRONTEND_ORIGINS,
      ...(process.env.FRONTEND_URL || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ],
  ),
);
const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many AI generation requests. Please try again in a minute.",
  },
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.status(200).send("OK");
});
app.use("/api/generate", generateLimiter);
app.use("/api", aiRoutes);
app.use("/api/learning", learningRoutes);

// Image proxy — fetches Firebase Storage images server-side to bypass browser CORS
app.get("/api/image-proxy", async (request, response) => {
  try {
    const { url } = request.query;

    if (!url || typeof url !== "string") {
      return response.status(400).json({ error: "Missing url parameter" });
    }

    // Only allow Firebase Storage URLs for security
    if (!url.includes("firebasestorage.googleapis.com")) {
      return response.status(403).json({ error: "Only Firebase Storage URLs are allowed" });
    }

    const imageResponse = await fetch(url);

    if (!imageResponse.ok) {
      return response.status(imageResponse.status).json({ error: "Failed to fetch image" });
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    response.json({
      base64: `data:${contentType};base64,${base64}`,
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    response.status(500).json({ error: "Failed to fetch image" });
  }
});

app.use((error, _request, response, _next) => {
  console.error("Unhandled backend error.", error);
  response.status(error?.statusCode || 500).json({
    success: false,
    error: error?.message || "Unexpected backend error.",
  });
});

app.listen(PORT, () => {
  console.log(`WriterZ backend listening on port ${PORT}`);
});
