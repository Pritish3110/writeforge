import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { aiRoutes } from "./routes/aiRoutes.js";

const app = express();
const PORT = Number.parseInt(process.env.PORT || "5000", 10);
const DEFAULT_FRONTEND_URL = "http://localhost:5173";
const allowedOrigins = (process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
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
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.status(200).send("OK");
});
app.use("/api/generate", generateLimiter);
app.use("/api", aiRoutes);

app.use((error, _request, response, _next) => {
  console.error("Unhandled backend error.", error);
  response.status(500).json({
    success: false,
    error: "Unexpected backend error.",
  });
});

app.listen(PORT, () => {
  console.log(`WriterZ backend listening on port ${PORT}`);
});
